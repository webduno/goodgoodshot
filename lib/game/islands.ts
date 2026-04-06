import { BLOCK_SIZE } from "@/lib/game/constants";
import { manhattanPathLaneToGoal } from "@/lib/game/path";
import type {
  IslandBushOffset,
  IslandRect,
  MiniVillageHouse,
  MiniVillageSpec,
  Vec3,
} from "@/lib/game/types";

export type { IslandRect } from "@/lib/game/types";

/**
 * Snap island center + square half-extents to the 1-block world grid (same units as
 * `snapBlockCenterToGrid` / lane cells) so turf edges line up with block boundaries.
 */
export function snapIslandFootprintToBlockGrid(is: IslandRect): void {
  let side = Math.max(is.halfX * 2, is.halfZ * 2);
  side = Math.max(BLOCK_SIZE, Math.ceil(side / BLOCK_SIZE) * BLOCK_SIZE);
  is.halfX = side / 2;
  is.halfZ = side / 2;
  const step = BLOCK_SIZE / 2;
  is.worldX = Math.round(is.worldX / step) * step;
  is.worldZ = Math.round(is.worldZ / step) * step;
}

const NUM_ISLANDS = 4;

/** Integer block count in [lo, hi] inclusive — gaps and offsets use whole blocks (Minecraft-style grid). */
function randomBlockCountInclusive(rng: () => number, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/** Parent island half-extent must be large enough to form two pads + gap (`maybeSplitSideBySide`). */
const MIN_PARENT_HALF_FOR_SPLIT = 7 * BLOCK_SIZE;
/** Each half after split must still hold a centered coin with margin. */
const MIN_HALF_EXTENT_PER_SPLIT_PAD = 2.5 * BLOCK_SIZE;
/** Lane bonus coin sits at integer grid `(round(worldX), round(worldZ))` — keep bushes/trees off that spot. */
const MIN_DECORATION_FROM_COIN = 2.35 * BLOCK_SIZE;

/**
 * Four disconnected platforms along the grid path from lane origin to goal (spawn → coins → goal),
 * with void between them. Spawn and goal are forced inside the first and last island.
 */
export function computeIslandsForLane(
  laneOrigin: Vec3,
  goalCenter: Vec3,
  spawnCenter: Vec3
): { islands: IslandRect[]; miniVillage: MiniVillageSpec } {
  const path = manhattanPathLaneToGoal(laneOrigin, goalCenter);
  const cells: Vec3[] = [laneOrigin, ...path];
  const n = cells.length;

  /** Integer padding in world units (blocks) so bbox math stays on-grid before snap. */
  const padX = 2;
  const padZ = 2;
  /** Min half-extent before content clamp; coins sit on island centers (not a full ±lane strip). */
  const minHalfXBase = 4;
  const minHalfZ = 2;

  if (n === 0) {
    const islands = [
      bboxToIsland(
        spawnCenter[0],
        spawnCenter[2],
        goalCenter[0],
        goalCenter[2],
        padX,
        padZ,
        minHalfXBase,
        minHalfZ
      ),
    ];
    const rngEarly = mulberry32(hashSeed(laneOrigin, goalCenter));
    placeBushesOnIslands(islands, rngEarly, spawnCenter, goalCenter);
    placeIslandTreesOnIslands(islands, rngEarly, spawnCenter, goalCenter);
    const rngVillageEarly = mulberry32((hashSeed(laneOrigin, goalCenter) ^ 0x9e3779b9) >>> 0);
    const miniVillage = placeMiniVillageOnIslands(
      islands,
      rngVillageEarly,
      spawnCenter,
      goalCenter
    );
    return { islands, miniVillage };
  }

  let gapCells = 3;
  const totalGaps = NUM_ISLANDS - 1;

  let usable = n - gapCells * totalGaps;
  while (usable < NUM_ISLANDS && gapCells > 0) {
    gapCells -= 1;
    usable = n - gapCells * totalGaps;
  }

  const base = Math.floor(usable / NUM_ISLANDS);
  const rem = usable % NUM_ISLANDS;

  let o = 0;
  const islands: IslandRect[] = [];

  for (let i = 0; i < NUM_ISLANDS; i++) {
    const take =
      i === NUM_ISLANDS - 1 ? n - o : base + (i < rem ? 1 : 0);
    const group = cells.slice(o, o + take);
    o += take;
    if (i < NUM_ISLANDS - 1) o += gapCells;

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const c of group) {
      minX = Math.min(minX, c[0]);
      maxX = Math.max(maxX, c[0]);
      minZ = Math.min(minZ, c[2]);
      maxZ = Math.max(maxZ, c[2]);
    }
    if (i === 0) {
      minX = Math.min(minX, spawnCenter[0]);
      maxX = Math.max(maxX, spawnCenter[0]);
      minZ = Math.min(minZ, spawnCenter[2]);
      maxZ = Math.max(maxZ, spawnCenter[2]);
    }
    if (i === NUM_ISLANDS - 1) {
      minX = Math.min(minX, goalCenter[0]);
      maxX = Math.max(maxX, goalCenter[0]);
      minZ = Math.min(minZ, goalCenter[2]);
      maxZ = Math.max(maxZ, goalCenter[2]);
    }

    const cx = (minX + maxX) / 2;
    const cz = (minZ + maxZ) / 2;
    const halfX = Math.max(
      minHalfXBase,
      (maxX - minX) / 2 + padX
    );
    const halfZ = Math.max(minHalfZ, (maxZ - minZ) / 2 + padZ);
    islands.push({
      worldX: cx,
      worldZ: cz,
      halfX,
      halfZ,
      blockThickness: 0.72,
      bushes: [],
      trees: [],
    });
  }

  enforceVoidGapsBetweenIslands(islands);

  const rng = mulberry32(hashSeed(laneOrigin, goalCenter));
  applyIslandRandomness(islands, rng, spawnCenter, goalCenter);
  squarifyIslands(islands, rng);
  maybeSplitSideBySide(islands, rng);
  for (const is of islands) clampIslandHalfExtent(is, rng);
  enforceVoidGapsBetweenIslands(islands, rng);
  /** Random offsets + Z-shrink for gaps can leave spawn/goal outside every island → tank clips block sides. */
  ensureSpawnAndGoalOnIslands(islands, spawnCenter, goalCenter);
  for (const is of islands) clampIslandHalfExtent(is, rng);
  for (const is of islands) snapIslandFootprintToBlockGrid(is);
  ensureSpawnAndGoalOnIslands(islands, spawnCenter, goalCenter);
  for (const is of islands) snapIslandFootprintToBlockGrid(is);
  resolveOverlappingIslandPairsInXZ(islands);
  placeBushesOnIslands(islands, rng, spawnCenter, goalCenter);
  placeIslandTreesOnIslands(islands, rng, spawnCenter, goalCenter);
  const rngVillage = mulberry32((hashSeed(laneOrigin, goalCenter) ^ 0x9e3779b9) >>> 0);
  const miniVillage = placeMiniVillageOnIslands(
    islands,
    rngVillage,
    spawnCenter,
    goalCenter
  );
  return { islands, miniVillage };
}

/** Deep copy for immutable updates from game reducer. */
export function cloneIslands(islands: readonly IslandRect[]): IslandRect[] {
  return islands.map((is) => ({
    ...is,
    bushes: [...is.bushes],
    trees: [...is.trees],
  }));
}

/**
 * After a shot, grow islands if spawn/goal sit outside footprints (spawn moves; course layout stays).
 */
export function ensureSpawnAndGoalOnIslandsImmutable(
  islands: readonly IslandRect[],
  spawn: Vec3,
  goal: Vec3
): IslandRect[] {
  const next = cloneIslands(islands);
  ensureSpawnAndGoalOnIslands(next, spawn, goal);
  for (const is of next) snapIslandFootprintToBlockGrid(is);
  resolveOverlappingIslandPairsInXZ(next);
  return next;
}

/**
 * Side-by-side pads can overlap in X after 0.5-grid snapping; separate along X when AABBs intersect in XZ.
 */
function resolveOverlappingIslandPairsInXZ(islands: IslandRect[]): void {
  /** At least one full block of air between split pads (same as void gap scale). */
  const minGap = BLOCK_SIZE;
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < islands.length - 1; i++) {
      const a = islands[i];
      const b = islands[i + 1];
      const centerDz = Math.abs(a.worldZ - b.worldZ);
      /** Same-Z-band pairs only (side-by-side split pads), not spawn→goal chain along Z. */
      if (centerDz > Math.min(a.halfZ, b.halfZ) * 0.85) continue;
      const ax0 = a.worldX - a.halfX;
      const ax1 = a.worldX + a.halfX;
      const az0 = a.worldZ - a.halfZ;
      const az1 = a.worldZ + a.halfZ;
      const bx0 = b.worldX - b.halfX;
      const bx1 = b.worldX + b.halfX;
      const bz0 = b.worldZ - b.halfZ;
      const bz1 = b.worldZ + b.halfZ;
      const xOverlap = Math.min(ax1, bx1) - Math.max(ax0, bx0);
      const zOverlap = Math.min(az1, bz1) - Math.max(az0, bz0);
      if (xOverlap <= 0 || zOverlap <= 0) continue;
      const step = BLOCK_SIZE / 2;
      let push = xOverlap / 2 + minGap / 2;
      push = Math.max(step, Math.ceil(push / step) * step);
      if (a.worldX < b.worldX) {
        a.worldX -= push;
        b.worldX += push;
      } else {
        a.worldX += push;
        b.worldX -= push;
      }
      a.worldX = Math.round(a.worldX / step) * step;
      b.worldX = Math.round(b.worldX / step) * step;
    }
  }
}

function bboxToIsland(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  padX: number,
  padZ: number,
  minHalfXBase: number,
  minHalfZ: number
): IslandRect {
  const minX = Math.min(ax, bx);
  const maxX = Math.max(ax, bx);
  const minZ = Math.min(az, bz);
  const maxZ = Math.max(az, bz);
  return {
    worldX: (minX + maxX) / 2,
    worldZ: (minZ + maxZ) / 2,
    halfX: Math.max(minHalfXBase, (maxX - minX) / 2 + padX),
    halfZ: Math.max(minHalfZ, (maxZ - minZ) / 2 + padZ),
    blockThickness: 0.72,
    bushes: [],
    trees: [],
  };
}

/** Offset of the lane coin from island center `(ox, oz)` in the same space as bush/tree offsets. */
function coinOffsetFromIslandCenter(is: IslandRect): { ox: number; oz: number } {
  return {
    ox: Math.round(is.worldX) - is.worldX,
    oz: Math.round(is.worldZ) - is.worldZ,
  };
}

function shuffleIslandOrder(n: number, rng: () => number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

/** Must match horizontal footprint used in `IslandMiniVillage` (half-width of one house). */
const MINI_VILLAGE_HOUSE_HALF_XZ = 0.78;
/** Min center-to-center spacing so main blocks do not overlap. */
const MINI_VILLAGE_HOUSE_SEP = 1.28;

const MINI_VILLAGE_PALETTE = [
  "#8ec5e8",
  "#f5b8c8",
  "#b8e8c8",
  "#c9b8f0",
  "#ffd4b8",
  "#a8d4f0",
] as const;

function fibonacciDiskOffsets(count: number, scale: number): [number, number][] {
  const out: [number, number][] = [[0, 0]];
  if (count <= 1) return out.slice(0, count);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 1; i < count; i++) {
    /** Keep spacing ≥ `MINI_VILLAGE_HOUSE_SEP` from origin and between neighbors on the spiral. */
    const r = scale * 1.02 * Math.sqrt(i);
    const theta = i * golden;
    out.push([r * Math.cos(theta), r * Math.sin(theta)]);
  }
  return out.slice(0, count);
}

function shuffleMiniVillageColors(
  count: number,
  rng: () => number
): readonly string[] {
  const pool = [...MINI_VILLAGE_PALETTE];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = t;
  }
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    colors.push(pool[i % pool.length]!);
  }
  return colors;
}

function assignMiniVillageStories(count: number, rng: () => number): (1 | 2)[] {
  const s: (1 | 2)[] = [];
  for (let i = 0; i < count; i++) {
    s.push(rng() < 0.5 ? 1 : 2);
  }
  if (count >= 2) {
    /** At least one short and one tall (indices 0 and 1). */
    s[0] = 1;
    s[1] = 2;
  }
  return s;
}

function miniVillagePointAllowed(
  is: IslandRect,
  islandIdx: number,
  islands: IslandRect[],
  wx: number,
  wz: number,
  spawnCenter: Vec3,
  goalCenter: Vec3,
  relax: boolean
): boolean {
  const inset = MINI_VILLAGE_HOUSE_HALF_XZ;
  if (
    Math.abs(wx - is.worldX) > is.halfX - inset ||
    Math.abs(wz - is.worldZ) > is.halfZ - inset
  ) {
    return false;
  }
  const isFirst = islandIdx === 0;
  const isLast = islandIdx === islands.length - 1;
  const { ox: coinOx, oz: coinOz } = coinOffsetFromIslandCenter(is);
  const ox = wx - is.worldX;
  const oz = wz - is.worldZ;
  if (
    Math.hypot(ox - coinOx, oz - coinOz) <
    MIN_DECORATION_FROM_COIN * (relax ? 0.62 : 1)
  ) {
    return false;
  }
  const minFromSpawn = 2.0 * BLOCK_SIZE;
  const minFromGoal = 2.0 * BLOCK_SIZE;
  if (isFirst) {
    const ds = Math.hypot(wx - spawnCenter[0], wz - spawnCenter[2]);
    if (ds < minFromSpawn * (relax ? 0.62 : 1)) return false;
  }
  if (isLast) {
    const dg = Math.hypot(wx - goalCenter[0], wz - goalCenter[2]);
    if (dg < minFromGoal * (relax ? 0.62 : 1)) return false;
  }
  return true;
}

/** 2–6 houses on one random island; at least one short and one tall when count ≥ 2. */
function placeMiniVillageOnIslands(
  islands: IslandRect[],
  rng: () => number,
  spawnCenter: Vec3,
  goalCenter: Vec3
): MiniVillageSpec {
  const n = islands.length;
  if (n === 0) return { houses: [] };
  /** Spawn sits on island 0 — mini village is never placed there. */
  if (n <= 1) return { houses: [] };

  const margin = 1.05 * BLOCK_SIZE;
  const minFromSpawn = 2.0 * BLOCK_SIZE;
  const minFromGoal = 2.0 * BLOCK_SIZE;

  const tryIslandAnchor = (
    islandIdx: number
  ): { worldX: number; worldZ: number } | null => {
    const is = islands[islandIdx]!;
    const maxHalfX = Math.max(0, is.halfX - margin);
    const maxHalfZ = Math.max(0, is.halfZ - margin);
    if (maxHalfX < 0.2 || maxHalfZ < 0.2) return null;

    const isFirst = islandIdx === 0;
    const isLast = islandIdx === islands.length - 1;
    const { ox: coinOx, oz: coinOz } = coinOffsetFromIslandCenter(is);

    for (let attempt = 0; attempt < 56; attempt++) {
      const relax = attempt > 32;
      const ox = (rng() * 2 - 1) * maxHalfX;
      const oz = (rng() * 2 - 1) * maxHalfZ;
      const wx = is.worldX + ox;
      const wz = is.worldZ + oz;
      if (
        Math.hypot(ox - coinOx, oz - coinOz) <
        MIN_DECORATION_FROM_COIN * (relax ? 0.62 : 1)
      ) {
        continue;
      }
      if (isFirst) {
        const ds = Math.hypot(wx - spawnCenter[0], wz - spawnCenter[2]);
        if (ds < minFromSpawn * (relax ? 0.62 : 1)) continue;
      }
      if (isLast) {
        const dg = Math.hypot(wx - goalCenter[0], wz - goalCenter[2]);
        if (dg < minFromGoal * (relax ? 0.62 : 1)) continue;
      }
      return { worldX: wx, worldZ: wz };
    }

    const sx = spawnCenter[0] - is.worldX;
    const sz = spawnCenter[2] - is.worldZ;
    const gx = goalCenter[0] - is.worldX;
    const gz = goalCenter[2] - is.worldZ;
    let ox = maxHalfX * 0.55 * (sx >= 0 ? -1 : 1);
    let oz = maxHalfZ * 0.55 * (sz >= 0 ? -1 : 1);
    if (isLast) {
      ox = maxHalfX * 0.55 * (gx >= 0 ? -1 : 1);
      oz = maxHalfZ * 0.55 * (gz >= 0 ? -1 : 1);
    }
    ox = Math.max(-maxHalfX, Math.min(maxHalfX, ox));
    oz = Math.max(-maxHalfZ, Math.min(maxHalfZ, oz));
    return { worldX: is.worldX + ox, worldZ: is.worldZ + oz };
  };

  let anchor: { worldX: number; worldZ: number } | null = null;
  let islandIdx = 1;
  const firstForbidden = 1;
  const eligible = n - firstForbidden;
  const startIdx = firstForbidden + Math.floor(rng() * eligible);
  for (let k = 0; k < eligible; k++) {
    const idx = firstForbidden + ((startIdx - firstForbidden + k) % eligible);
    const p = tryIslandAnchor(idx);
    if (p) {
      anchor = p;
      islandIdx = idx;
      break;
    }
  }
  if (!anchor) {
    return { houses: [] };
  }

  const island = islands[islandIdx]!;
  let targetCount = 2 + Math.floor(rng() * 5);

  const tryBuild = (count: number): MiniVillageHouse[] | null => {
    const scales = [1.62, 1.38, 1.12, 0.92, 0.78];
    for (const scale of scales) {
      for (let attempt = 0; attempt < 36; attempt++) {
        const relax = attempt > 22;
        const rot = rng() * Math.PI * 2;
        const cosR = Math.cos(rot);
        const sinR = Math.sin(rot);
        const raw = fibonacciDiskOffsets(count, scale);
        const pts: { wx: number; wz: number }[] = [];
        let ok = true;
        for (const [lx, lz] of raw) {
          const rx = lx * cosR - lz * sinR;
          const rz = lx * sinR + lz * cosR;
          const wx = anchor!.worldX + rx;
          const wz = anchor!.worldZ + rz;
          if (
            !miniVillagePointAllowed(
              island,
              islandIdx,
              islands,
              wx,
              wz,
              spawnCenter,
              goalCenter,
              relax
            )
          ) {
            ok = false;
            break;
          }
          for (const q of pts) {
            if (Math.hypot(wx - q.wx, wz - q.wz) < MINI_VILLAGE_HOUSE_SEP) {
              ok = false;
              break;
            }
          }
          if (!ok) break;
          pts.push({ wx, wz });
        }
        if (!ok || pts.length !== count) continue;

        const stories = assignMiniVillageStories(count, rng);
        const colors = shuffleMiniVillageColors(count, rng);
        const houses: MiniVillageHouse[] = [];
        for (let i = 0; i < count; i++) {
          houses.push({
            worldX: pts[i]!.wx,
            worldZ: pts[i]!.wz,
            stories: stories[i]!,
            colorHex: colors[i]!,
          });
        }
        return houses;
      }
    }
    return null;
  };

  while (targetCount >= 2) {
    const built = tryBuild(targetCount);
    if (built) {
      return { houses: built };
    }
    targetCount -= 1;
  }

  const stories = assignMiniVillageStories(2, rng);
  const colors = shuffleMiniVillageColors(2, rng);
  const dx = MINI_VILLAGE_HOUSE_SEP * 0.55;
  const h0: MiniVillageHouse = {
    worldX: anchor.worldX - dx,
    worldZ: anchor.worldZ,
    stories: stories[0]!,
    colorHex: colors[0]!,
  };
  const h1: MiniVillageHouse = {
    worldX: anchor.worldX + dx,
    worldZ: anchor.worldZ,
    stories: stories[1]!,
    colorHex: colors[1]!,
  };
  return { houses: [h0, h1] };
}

/** Two random islands get one tree each (two trees on the only island if there is just one). */
function placeIslandTreesOnIslands(
  islands: IslandRect[],
  rng: () => number,
  spawnCenter: Vec3,
  goalCenter: Vec3
): void {
  for (const is of islands) {
    is.trees = [];
  }

  const n = islands.length;
  if (n === 0) return;

  const perm = shuffleIslandOrder(n, rng);
  const idxA = n >= 2 ? perm[0]! : 0;
  const idxB = n >= 2 ? perm[1]! : 0;

  const margin = 2.5 * BLOCK_SIZE;
  const minFromSpawn = 2.5 * BLOCK_SIZE;
  const minFromGoal = 2.5 * BLOCK_SIZE;
  const minFromBush = 1.85 * BLOCK_SIZE;
  const minFromOtherTree = 2.65 * BLOCK_SIZE;

  const tryOffset = (
    is: IslandRect,
    islandIdx: number,
    ox: number,
    oz: number,
    relaxSpawn: boolean,
    relaxGoal: boolean,
    others: readonly IslandBushOffset[]
  ): boolean => {
    const isFirst = islandIdx === 0;
    const isLast = islandIdx === islands.length - 1;
    const wx = is.worldX + ox;
    const wz = is.worldZ + oz;
    const relax = relaxSpawn && relaxGoal;
    const { ox: coinOx, oz: coinOz } = coinOffsetFromIslandCenter(is);
    if (
      Math.hypot(ox - coinOx, oz - coinOz) <
      MIN_DECORATION_FROM_COIN * (relax ? 0.62 : 1)
    ) {
      return false;
    }
    if (isFirst) {
      const ds = Math.hypot(wx - spawnCenter[0], wz - spawnCenter[2]);
      if (ds < minFromSpawn * (relaxSpawn ? 0.62 : 1)) return false;
    }
    if (isLast) {
      const dg = Math.hypot(wx - goalCenter[0], wz - goalCenter[2]);
      if (dg < minFromGoal * (relaxGoal ? 0.62 : 1)) return false;
    }
    for (const b of is.bushes) {
      if (Math.hypot(ox - b.ox, oz - b.oz) < minFromBush) return false;
    }
    for (const o of others) {
      if (Math.hypot(ox - o.ox, oz - o.oz) < minFromOtherTree) return false;
    }
    return true;
  };

  const placeOne = (
    islandIdx: number,
    others: readonly IslandBushOffset[]
  ): IslandBushOffset | null => {
    const is = islands[islandIdx]!;
    const maxHalfX = Math.max(0, is.halfX - margin);
    const maxHalfZ = Math.max(0, is.halfZ - margin);
    if (maxHalfX < 0.35 || maxHalfZ < 0.35) return null;

    for (let attempt = 0; attempt < 56; attempt++) {
      const relax = attempt > 32;
      const ox = (rng() * 2 - 1) * maxHalfX;
      const oz = (rng() * 2 - 1) * maxHalfZ;
      if (tryOffset(is, islandIdx, ox, oz, relax, relax, others)) {
        return { ox, oz };
      }
    }

    const sx = spawnCenter[0] - is.worldX;
    const sz = spawnCenter[2] - is.worldZ;
    const gx = goalCenter[0] - is.worldX;
    const gz = goalCenter[2] - is.worldZ;
    let ox = maxHalfX * 0.62 * (sx >= 0 ? -1 : 1);
    let oz = maxHalfZ * 0.62 * (sz >= 0 ? -1 : 1);
    if (islandIdx === islands.length - 1) {
      ox = maxHalfX * 0.62 * (gx >= 0 ? -1 : 1);
      oz = maxHalfZ * 0.62 * (gz >= 0 ? -1 : 1);
    }
    ox = Math.max(-maxHalfX, Math.min(maxHalfX, ox));
    oz = Math.max(-maxHalfZ, Math.min(maxHalfZ, oz));
    if (tryOffset(is, islandIdx, ox, oz, true, true, others)) {
      return { ox, oz };
    }
    const { ox: coinOx, oz: coinOz } = coinOffsetFromIslandCenter(is);
    for (let k = 0; k < 10; k++) {
      const dx = ox - coinOx;
      const dz = oz - coinOz;
      const len = Math.hypot(dx, dz) || 1;
      ox += (dx / len) * (BLOCK_SIZE * 0.85);
      oz += (dz / len) * (BLOCK_SIZE * 0.85);
      ox = Math.max(-maxHalfX, Math.min(maxHalfX, ox));
      oz = Math.max(-maxHalfZ, Math.min(maxHalfZ, oz));
      if (tryOffset(is, islandIdx, ox, oz, true, true, others)) {
        return { ox, oz };
      }
    }
    return null;
  };

  const first = placeOne(idxA, []);
  if (first) {
    if (idxA === idxB) {
      islands[idxA]!.trees = [first];
      const second = placeOne(idxB, [first]);
      if (second) {
        islands[idxB]!.trees = [first, second];
      }
    } else {
      islands[idxA]!.trees = [first];
      const second = placeOne(idxB, []);
      if (second) {
        islands[idxB]!.trees = [second];
      }
    }
  }
}

/** One or two small leaf clusters per island; keeps clear of spawn/goal on end pads. */
function placeBushesOnIslands(
  islands: IslandRect[],
  rng: () => number,
  spawnCenter: Vec3,
  goalCenter: Vec3
): void {
  const margin = 1.1 * BLOCK_SIZE;
  const minFromSpawn = 2.1 * BLOCK_SIZE;
  const minFromGoal = 2.1 * BLOCK_SIZE;
  const minBushSep = 1.05 * BLOCK_SIZE;

  for (let i = 0; i < islands.length; i++) {
    const is = islands[i];
    const isFirst = i === 0;
    const isLast = i === islands.length - 1;
    const maxHalfX = Math.max(0, is.halfX - margin);
    const maxHalfZ = Math.max(0, is.halfZ - margin);
    if (maxHalfX < 0.25 || maxHalfZ < 0.25) {
      is.bushes = [];
      continue;
    }

    const want = rng() < 0.48 ? 1 : 2;
    const placements: IslandBushOffset[] = [];
    const { ox: coinOx, oz: coinOz } = coinOffsetFromIslandCenter(is);

    const tryPush = (ox: number, oz: number, relaxSpawn: boolean, relaxGoal: boolean) => {
      const wx = is.worldX + ox;
      const wz = is.worldZ + oz;
      const relax = relaxSpawn && relaxGoal;
      if (
        Math.hypot(ox - coinOx, oz - coinOz) <
        MIN_DECORATION_FROM_COIN * (relax ? 0.55 : 1)
      ) {
        return false;
      }
      if (isFirst) {
        const ds = Math.hypot(wx - spawnCenter[0], wz - spawnCenter[2]);
        if (ds < minFromSpawn * (relaxSpawn ? 0.55 : 1)) return false;
      }
      if (isLast) {
        const dg = Math.hypot(wx - goalCenter[0], wz - goalCenter[2]);
        if (dg < minFromGoal * (relaxGoal ? 0.55 : 1)) return false;
      }
      if (placements.length > 0) {
        const d = Math.hypot(ox - placements[0]!.ox, oz - placements[0]!.oz);
        if (d < minBushSep) return false;
      }
      placements.push({ ox, oz });
      return true;
    };

    for (let b = 0; b < want; b++) {
      let placed = false;
      for (let attempt = 0; attempt < 48; attempt++) {
        const relax = attempt > 28;
        const ox = (rng() * 2 - 1) * maxHalfX;
        const oz = (rng() * 2 - 1) * maxHalfZ;
        if (tryPush(ox, oz, relax, relax)) {
          placed = true;
          break;
        }
      }
      if (!placed && b === 0) {
        const sx = spawnCenter[0] - is.worldX;
        const sz = spawnCenter[2] - is.worldZ;
        const gx = goalCenter[0] - is.worldX;
        const gz = goalCenter[2] - is.worldZ;
        let ox = maxHalfX * 0.65 * (sx >= 0 ? -1 : 1);
        let oz = maxHalfZ * 0.65 * (sz >= 0 ? -1 : 1);
        if (isLast) {
          ox = maxHalfX * 0.65 * (gx >= 0 ? -1 : 1);
          oz = maxHalfZ * 0.65 * (gz >= 0 ? -1 : 1);
        }
        ox = Math.max(-maxHalfX, Math.min(maxHalfX, ox));
        oz = Math.max(-maxHalfZ, Math.min(maxHalfZ, oz));
        if (!tryPush(ox, oz, true, true)) {
          for (let k = 0; k < 10; k++) {
            const dx = ox - coinOx;
            const dz = oz - coinOz;
            const len = Math.hypot(dx, dz) || 1;
            ox += (dx / len) * (BLOCK_SIZE * 0.85);
            oz += (dz / len) * (BLOCK_SIZE * 0.85);
            ox = Math.max(-maxHalfX, Math.min(maxHalfX, ox));
            oz = Math.max(-maxHalfZ, Math.min(maxHalfZ, oz));
            if (tryPush(ox, oz, true, true)) break;
          }
        }
      }
    }

    is.bushes = placements;
  }
}

/** Minimum square half-extent (world units) so pads are playable; coins are at island center. */
function clampIslandHalfExtent(is: IslandRect, rng: () => number): void {
  const baseMin = 2.5 * BLOCK_SIZE + rng() * 1.5;
  const half = Math.max(is.halfX, is.halfZ, baseMin);
  const fullSide = Math.max(
    BLOCK_SIZE,
    Math.ceil((half * 2) / BLOCK_SIZE) * BLOCK_SIZE
  );
  is.halfX = fullSide / 2;
  is.halfZ = fullSide / 2;
}

/** Deterministic RNG from hole layout (stable across re-renders for the same hole). */
function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** RNG seed for island decoration — lane + goal only so layout does not depend on moving spawn. */
function hashSeed(laneOrigin: Vec3, goal: Vec3): number {
  let h = 2166136261 >>> 0;
  const mix = (v: number) => {
    const x = Math.floor(v * 1e6 + 1024) >>> 0;
    h ^= x;
    h = Math.imul(h, 16777619) >>> 0;
  };
  mix(laneOrigin[0]);
  mix(laneOrigin[2]);
  mix(goal[0]);
  mix(goal[2]);
  return h || 1;
}

function ensurePointOnIsland(
  island: IslandRect,
  px: number,
  pz: number
): void {
  const dx = Math.abs(px - island.worldX);
  const dz = Math.abs(pz - island.worldZ);
  const need = Math.max(dx, dz) + BLOCK_SIZE * 0.05;
  let side = Math.max(island.halfX * 2, island.halfZ * 2, need * 2);
  side = Math.ceil(side / BLOCK_SIZE) * BLOCK_SIZE;
  island.halfX = side / 2;
  island.halfZ = side / 2;
}

function pointInsideIslandXZ(
  is: IslandRect,
  px: number,
  pz: number
): boolean {
  return (
    Math.abs(px - is.worldX) <= is.halfX &&
    Math.abs(pz - is.worldZ) <= is.halfZ
  );
}

/** After jitter + gap enforcement, grow the nearest island so spawn and goal sit on solid top (same XZ as physics). */
function ensureSpawnAndGoalOnIslands(
  islands: IslandRect[],
  spawn: Vec3,
  goal: Vec3
): void {
  for (const p of [
    { x: spawn[0], z: spawn[2] },
    { x: goal[0], z: goal[2] },
  ]) {
    if (islands.some((is) => pointInsideIslandXZ(is, p.x, p.z))) continue;
    let bestIdx = 0;
    let bestD = Infinity;
    for (let i = 0; i < islands.length; i++) {
      const is = islands[i];
      const d = Math.hypot(p.x - is.worldX, p.z - is.worldZ);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    }
    ensurePointOnIsland(islands[bestIdx], p.x, p.z);
  }
}

function applyIslandRandomness(
  islands: IslandRect[],
  rng: () => number,
  spawnCenter: Vec3,
  goalCenter: Vec3
): void {
  for (let i = 0; i < islands.length; i++) {
    const is = islands[i];
    /** Same scale on X and Z so random sizing stays square. */
    const s = 0.45 + rng() * 1.05;
    is.halfX *= s;
    is.halfZ *= s;

    /** Keep centers on the lane grid — off-grid jitter breaks 1-block turf alignment with teleport snaps. */
    is.blockThickness = 0.52 + rng() * 0.78;

    if (i === 0) ensurePointOnIsland(is, spawnCenter[0], spawnCenter[2]);
    if (i === islands.length - 1)
      ensurePointOnIsland(is, goalCenter[0], goalCenter[2]);
  }
}

/** Equal half-extents on XZ so each pad is a true square footprint. */
function squarifyIslands(islands: IslandRect[], rng: () => number): void {
  const n = islands.length;
  for (let i = 0; i < n; i++) {
    const is = islands[i];
    const middle = i > 0 && i < n - 1;
    /** Middle segments need enough span for optional side-by-side split (see `maybeSplitSideBySide`). */
    const m = Math.max(
      is.halfX,
      is.halfZ,
      2.5 * BLOCK_SIZE,
      middle ? MIN_PARENT_HALF_FOR_SPLIT + BLOCK_SIZE : 0
    );
    const s = 0.88 + rng() * 0.26;
    const half = m * s;
    const fullSide = Math.max(
      BLOCK_SIZE,
      Math.ceil((half * 2) / BLOCK_SIZE) * BLOCK_SIZE
    );
    is.halfX = fullSide / 2;
    is.halfZ = fullSide / 2;
    is.blockThickness *= 0.88 + rng() * 0.32;
  }
}

/**
 * Replace wide middle islands with two pads side-by-side (void gap in X between them).
 * Runs before coin clamp so typical squarified sizes qualify (old gate required halfX ≥ 23).
 */
function maybeSplitSideBySide(islands: IslandRect[], rng: () => number): void {
  let splitsLeft = 2;

  const trySplitAt = (i: number): boolean => {
    if (i === 0 || i === islands.length - 1) return false;
    const is = islands[i];
    if (is.halfX < MIN_PARENT_HALF_FOR_SPLIT) return false;

    /** Whole-block gap between inner edges (3–6 blocks), then positions stay grid-aligned. */
    const g = randomBlockCountInclusive(rng, 3, 6) * BLOCK_SIZE;
    const hx = is.halfX / 2 - g / 4;
    if (hx < MIN_HALF_EXTENT_PER_SPLIT_PAD) return false;

    const wx = is.worldX;
    const wz = is.worldZ;
    const hz = is.halfZ;
    /** Whole-block stagger along Z so split pads stay on the same grid as the course. */
    const zJ = randomBlockCountInclusive(rng, -2, 2) * BLOCK_SIZE;
    let leftHalf = Math.max(hx, hz * (0.75 + rng() * 0.38));
    let rightHalf = Math.max(hx, hz * (0.75 + rng() * 0.38));
    const snapHalf = (h: number) => {
      const side = Math.max(BLOCK_SIZE, Math.ceil((h * 2) / BLOCK_SIZE) * BLOCK_SIZE);
      return side / 2;
    };
    leftHalf = snapHalf(leftHalf);
    rightHalf = snapHalf(rightHalf);
    const step = BLOCK_SIZE / 2;
    const left: IslandRect = {
      worldX:
        Math.round((wx - is.halfX / 2 - g / 4) / step) * step,
      worldZ: Math.round((wz + zJ) / step) * step,
      halfX: leftHalf,
      halfZ: leftHalf,
      blockThickness: is.blockThickness * (0.78 + rng() * 0.35),
      bushes: [],
      trees: [],
    };
    const right: IslandRect = {
      worldX:
        Math.round((wx + is.halfX / 2 + g / 4) / step) * step,
      worldZ: Math.round((wz - zJ) / step) * step,
      halfX: rightHalf,
      halfZ: rightHalf,
      blockThickness: is.blockThickness * (0.78 + rng() * 0.35),
      bushes: [],
      trees: [],
    };

    islands.splice(i, 1, left, right);
    return true;
  };

  for (let i = islands.length - 1; i >= 0; i--) {
    if (splitsLeft <= 0) return;
    if (trySplitAt(i)) splitsLeft -= 1;
  }
}

/**
 * Shrink square footprints from the course-facing edges so neighbouring islands do not touch.
 * Both halfX and halfZ shrink by the same amount so pads stay square.
 */
function enforceVoidGapsBetweenIslands(
  islands: IslandRect[],
  rng?: () => number
) {
  for (let i = 0; i < islands.length - 1; i++) {
    /** Target void width in whole blocks (4–10 along course; 5 when not using rng). */
    const minGapBlocks = rng ? randomBlockCountInclusive(rng, 4, 10) : 5;
    const minGap = minGapBlocks * BLOCK_SIZE;
    const a = islands[i];
    const b = islands[i + 1];
    const aZ0 = a.worldZ - a.halfZ;
    const aZ1 = a.worldZ + a.halfZ;
    const bZ0 = b.worldZ - b.halfZ;
    const bZ1 = b.worldZ + b.halfZ;
    const zOverlap = Math.min(aZ1, bZ1) - Math.max(aZ0, bZ0);
    /** Side-by-side pads share a Z band; do not shrink them as if they were sequential along the course. */
    if (zOverlap > Math.min(a.halfZ, b.halfZ) * 0.35) continue;

    const endA = a.worldZ + a.halfZ;
    const startB = b.worldZ - b.halfZ;
    const gapBetween = startB - endA;
    if (gapBetween >= minGap) continue;
    const shortfall = minGap - gapBetween;
    let take = shortfall / 2;
    take = Math.ceil(take / (BLOCK_SIZE / 2)) * (BLOCK_SIZE / 2);
    const na = Math.max(2, a.halfX - take, a.halfZ - take);
    const nb = Math.max(2, b.halfX - take, b.halfZ - take);
    const ma = Math.max(na, 2);
    const mb = Math.max(nb, 2);
    a.halfX = ma;
    a.halfZ = ma;
    b.halfX = mb;
    b.halfZ = mb;
  }
}
