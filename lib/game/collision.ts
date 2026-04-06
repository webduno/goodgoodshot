import * as THREE from "three";

import {
  BLOCK_SIZE,
  FIELD_PLANE_HALF_WIDTH_X,
  FIELD_PLANE_Z_BEFORE_SPAWN,
  FIELD_PLANE_Z_PAST_GOAL,
  GOAL_HALF,
  GOAL_Z_MAX,
  PLAYER_GROUND_HALF,
} from "./constants";
import type { IslandRect } from "./islands";
import type { PondSpec, Vec3 } from "./types";

/** Half-extent on X for the outer field rect (matches `InitialFieldGround` width / 2). */
export function fieldOuterHalfExtentX(): number {
  return 2 * FIELD_PLANE_HALF_WIDTH_X;
}

export function fieldZBounds(): { z0: number; z1: number } {
  const z0 = -FIELD_PLANE_Z_BEFORE_SPAWN;
  const z1 = GOAL_Z_MAX + FIELD_PLANE_Z_PAST_GOAL;
  return { z0, z1 };
}

export function pointInOuterFieldXZ(px: number, pz: number): boolean {
  const hx = fieldOuterHalfExtentX();
  const { z0, z1 } = fieldZBounds();
  return Math.abs(px) <= hx && pz >= z0 && pz <= z1;
}

export function pointInPondXZ(px: number, pz: number, pond: PondSpec): boolean {
  return (
    Math.abs(px - pond.worldX) <= pond.halfX &&
    Math.abs(pz - pond.worldZ) <= pond.halfZ
  );
}

export function pointOnAnyIsland(
  px: number,
  pz: number,
  islands: readonly IslandRect[]
): boolean {
  for (const is of islands) {
    if (
      Math.abs(px - is.worldX) <= is.halfX &&
      Math.abs(pz - is.worldZ) <= is.halfZ
    ) {
      return true;
    }
  }
  return false;
}

/** True when (x,z) is not on any island platform (void / sky gap). */
export function pointInVoidXZ(
  px: number,
  pz: number,
  islands: readonly IslandRect[]
): boolean {
  return !pointOnAnyIsland(px, pz, islands);
}

export function rectsOverlapXZ(
  ax: number,
  az: number,
  ahx: number,
  ahz: number,
  bx: number,
  bz: number,
  bhx: number,
  bhz: number
): boolean {
  return (
    Math.abs(ax - bx) <= ahx + bhx && Math.abs(az - bz) <= ahz + bhz
  );
}

export function pondOverlapsPlayerCell(
  pondCx: number,
  pondCz: number,
  halfX: number,
  halfZ: number,
  spawnX: number,
  spawnZ: number
): boolean {
  return rectsOverlapXZ(
    pondCx,
    pondCz,
    halfX,
    halfZ,
    spawnX,
    spawnZ,
    PLAYER_GROUND_HALF,
    PLAYER_GROUND_HALF
  );
}

export function pondOverlapsGoalBlock(
  pondCx: number,
  pondCz: number,
  halfX: number,
  halfZ: number,
  goalX: number,
  goalZ: number
): boolean {
  const gh = BLOCK_SIZE / 2;
  return rectsOverlapXZ(
    pondCx,
    pondCz,
    halfX,
    halfZ,
    goalX,
    goalZ,
    gh,
    gh
  );
}

export function pondsOverlapEachOther(
  ax: number,
  az: number,
  ahx: number,
  ahz: number,
  bx: number,
  bz: number,
  bhx: number,
  bhz: number
): boolean {
  return rectsOverlapXZ(ax, az, ahx, ahz, bx, bz, bhx, bhz);
}

export function validPondPosition(
  x: number,
  z: number,
  halfX: number,
  halfZ: number,
  spawnX: number,
  spawnZ: number,
  goalX: number,
  goalZ: number,
  placed: readonly PondSpec[]
): boolean {
  if (pondOverlapsGoalBlock(x, z, halfX, halfZ, goalX, goalZ)) return false;
  if (pondOverlapsPlayerCell(x, z, halfX, halfZ, spawnX, spawnZ)) return false;
  for (const p of placed) {
    if (
      pondsOverlapEachOther(
        x,
        z,
        halfX,
        halfZ,
        p.worldX,
        p.worldZ,
        p.halfX,
        p.halfZ
      )
    ) {
      return false;
    }
  }
  return true;
}

export function sphereIntersectsAabb(
  px: number,
  py: number,
  pz: number,
  radius: number,
  center: Vec3,
  halfX: number,
  halfY: number,
  halfZ: number
): boolean {
  const cx = center[0];
  const cy = center[1];
  const cz = center[2];
  const minX = cx - halfX;
  const maxX = cx + halfX;
  const minY = cy - halfY;
  const maxY = cy + halfY;
  const minZ = cz - halfZ;
  const maxZ = cz + halfZ;

  const qx = THREE.MathUtils.clamp(px, minX, maxX);
  const qy = THREE.MathUtils.clamp(py, minY, maxY);
  const qz = THREE.MathUtils.clamp(pz, minZ, maxZ);
  const dx = px - qx;
  const dy = py - qy;
  const dz = pz - qz;
  return dx * dx + dy * dy + dz * dz < radius * radius;
}

export function sphereIntersectsGoalBox(
  px: number,
  py: number,
  pz: number,
  radius: number,
  goalCenter: Vec3
): boolean {
  return sphereIntersectsAabb(
    px,
    py,
    pz,
    radius,
    goalCenter,
    GOAL_HALF,
    GOAL_HALF,
    GOAL_HALF
  );
}
