import { pointInPondXZ } from "@/lib/game/collision";
import type { IslandRect } from "@/lib/game/islands";
import type { PondSpec, Vec3 } from "@/lib/game/types";
import { randomIntInclusive } from "@/lib/game/math";

export const EMPTY_MAP_CAGES_BROKEN: ReadonlySet<string> = new Set();

/** Stable default for hub / props when there are no map cages. */
export const NO_MAP_CAGES: readonly Vec3[] = [];

export function mapCageKey(sx: number, sz: number): string {
  return `${sx}|${sz}`;
}

function walkableHalf(is: IslandRect): { hx: number; hz: number } {
  return {
    hx: is.walkableHalfX ?? is.halfX,
    hz: is.walkableHalfZ ?? is.halfZ,
  };
}

function gridRangeForIsland(is: IslandRect): {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
} | null {
  const { hx, hz } = walkableHalf(is);
  const minX = Math.ceil(is.worldX - hx);
  const maxX = Math.floor(is.worldX + hx);
  const minZ = Math.ceil(is.worldZ - hz);
  const maxZ = Math.floor(is.worldZ + hz);
  if (minX > maxX || minZ > maxZ) return null;
  return { minX, maxX, minZ, maxZ };
}

function cellValidForCage(
  ix: number,
  iz: number,
  ponds: readonly PondSpec[],
  spawnCenter: Vec3,
  goalCenter: Vec3,
  placed: readonly Vec3[]
): boolean {
  const spawnSnapX = Math.round(spawnCenter[0]);
  const spawnSnapZ = Math.round(spawnCenter[2]);
  const goalSnapX = Math.round(goalCenter[0]);
  const goalSnapZ = Math.round(goalCenter[2]);
  if (
    Math.hypot(ix - spawnSnapX, iz - spawnSnapZ) < 4 ||
    Math.hypot(ix - goalSnapX, iz - goalSnapZ) < 5
  ) {
    return false;
  }
  for (const p of ponds) {
    if (pointInPondXZ(ix, iz, p)) return false;
  }
  for (const c of placed) {
    if (Math.hypot(ix - c[0], iz - c[2]) < 7) return false;
  }
  return true;
}

/**
 * Up to `maxCages` (2) random integer grid cells on random islands (same island allowed if far apart).
 * Count is 0, 1, or 2 (uniform); fewer if no valid cell is found.
 */
export function pickMapCages(
  islands: readonly IslandRect[],
  spawnCenter: Vec3,
  goalCenter: Vec3,
  ponds: readonly PondSpec[],
  maxCages: number = 2
): Vec3[] {
  if (islands.length === 0 || maxCages <= 0) return [];

  const targetCount = randomIntInclusive(0, maxCages);
  if (targetCount === 0) return [];

  const placed: Vec3[] = [];
  const gy = spawnCenter[1];
  let globalAttempts = 0;
  const maxGlobalAttempts = 120;

  while (placed.length < targetCount && globalAttempts < maxGlobalAttempts) {
    globalAttempts += 1;
    const idx = randomIntInclusive(0, islands.length - 1);
    const is = islands[idx]!;
    const range = gridRangeForIsland(is);
    if (!range) continue;

    const ix = randomIntInclusive(range.minX, range.maxX);
    const iz = randomIntInclusive(range.minZ, range.maxZ);
    if (!cellValidForCage(ix, iz, ponds, spawnCenter, goalCenter, placed)) {
      continue;
    }
    const dup = placed.some((c) => c[0] === ix && c[2] === iz);
    if (dup) continue;
    placed.push([ix, gy, iz]);
  }

  return placed;
}
