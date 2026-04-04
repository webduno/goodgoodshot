import {
  GOAL_X_MAX,
  GOAL_X_MIN,
  POND_HALF_X_MAX,
  POND_HALF_X_MIN,
  POND_HALF_Z_MAX,
  POND_HALF_Z_MIN,
} from "./constants";
import { randomIntInclusive } from "./math";
import type { PondSpec } from "./types";
import { validPondPosition } from "./collision";

/** Hazard placement along the lane between spawn and goal (grid Z). */
export function randomObstacleBetween(
  spawnZ: number,
  goalZ: number
): { x: number; z: number } {
  const tMin = Math.min(spawnZ, goalZ);
  const tMax = Math.max(spawnZ, goalZ);
  const lo = Math.round(tMin) + 4;
  const hi = Math.round(tMax) - 4;
  if (lo > hi) {
    const mid = Math.round((spawnZ + goalZ) / 2);
    return {
      x: randomIntInclusive(GOAL_X_MIN, GOAL_X_MAX),
      z: mid,
    };
  }
  return {
    x: randomIntInclusive(GOAL_X_MIN, GOAL_X_MAX),
    z: randomIntInclusive(lo, hi),
  };
}

export function tryPlacePond(
  halfX: number,
  halfZ: number,
  spawnX: number,
  spawnZ: number,
  goalX: number,
  goalZ: number,
  placed: readonly PondSpec[]
): { x: number; z: number } | null {
  for (let attempt = 0; attempt < 200; attempt++) {
    const o = randomObstacleBetween(spawnZ, goalZ);
    if (
      validPondPosition(o.x, o.z, halfX, halfZ, spawnX, spawnZ, goalX, goalZ, placed)
    ) {
      return o;
    }
  }
  const tMin = Math.min(spawnZ, goalZ);
  const tMax = Math.max(spawnZ, goalZ);
  const lo = Math.round(tMin) + 4;
  const hi = Math.round(tMax) - 4;
  const tryZList: number[] =
    lo > hi
      ? [Math.round((spawnZ + goalZ) / 2)]
      : Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  for (const zz of tryZList) {
    for (let x = GOAL_X_MIN; x <= GOAL_X_MAX; x++) {
      if (
        validPondPosition(x, zz, halfX, halfZ, spawnX, spawnZ, goalX, goalZ, placed)
      ) {
        return { x, z: zz };
      }
    }
  }
  return null;
}

/** One or two ponds with random sizes; rerolled with goal on hole-out. */
export function pickPondsLayout(
  spawnX: number,
  spawnZ: number,
  goalX: number,
  goalZ: number
): PondSpec[] {
  const count = randomIntInclusive(1, 2);
  const out: PondSpec[] = [];
  for (let i = 0; i < count; i++) {
    let hx = randomIntInclusive(POND_HALF_X_MIN, POND_HALF_X_MAX);
    let hz = randomIntInclusive(POND_HALF_Z_MIN, POND_HALF_Z_MAX);
    let pos = tryPlacePond(hx, hz, spawnX, spawnZ, goalX, goalZ, out);
    let tries = 0;
    while (!pos && tries < 28) {
      hx = randomIntInclusive(POND_HALF_X_MIN, POND_HALF_X_MAX);
      hz = randomIntInclusive(POND_HALF_Z_MIN, POND_HALF_Z_MAX);
      pos = tryPlacePond(hx, hz, spawnX, spawnZ, goalX, goalZ, out);
      tries++;
    }
    if (!pos) break;
    out.push({
      worldX: pos.x,
      worldZ: pos.z,
      halfX: hx,
      halfZ: hz,
      surfaceLayer: i === 0 ? 0 : 1,
    });
  }
  if (out.length === 0) {
    for (const hx of [4, 5, 3, 6]) {
      for (const hz of [5, 6, 4, 7]) {
        const pos = tryPlacePond(hx, hz, spawnX, spawnZ, goalX, goalZ, []);
        if (pos) {
          out.push({
            worldX: pos.x,
            worldZ: pos.z,
            halfX: hx,
            halfZ: hz,
            surfaceLayer: 0,
          });
          return out;
        }
      }
    }
  }
  return out;
}
