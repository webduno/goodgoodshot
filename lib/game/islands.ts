import { BLOCK_SIZE } from "@/lib/game/constants";
import { manhattanPathLaneToGoal } from "@/lib/game/path";
import type { IslandRect, Vec3 } from "@/lib/game/types";

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

/**
 * Four disconnected platforms along the grid path from lane origin to goal (spawn → coins → goal),
 * with void between them. Spawn and goal are forced inside the first and last island.
 */
export function computeIslandsForLane(
  laneOrigin: Vec3,
  goalCenter: Vec3,
  spawnCenter: Vec3
): IslandRect[] {
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
    return [
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
  return islands;
}

/** Deep copy for immutable updates from game reducer. */
export function cloneIslands(islands: readonly IslandRect[]): IslandRect[] {
  return islands.map((is) => ({ ...is }));
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
  };
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
    };
    const right: IslandRect = {
      worldX:
        Math.round((wx + is.halfX / 2 + g / 4) / step) * step,
      worldZ: Math.round((wz - zJ) / step) * step,
      halfX: rightHalf,
      halfZ: rightHalf,
      blockThickness: is.blockThickness * (0.78 + rng() * 0.35),
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
