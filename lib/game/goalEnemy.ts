import { VEHICLE_FOOTPRINT_HALF_XZ } from "@/lib/game/constants";

/** Combined ball + body hit radius for 3D distance (world units); matches 2× mesh scale. */
export const GOAL_ENEMY_HIT_RADIUS = 0.88;
/** Horizontal speed toward the vehicle; messenger ignores void gaps (floats). */
export const GOAL_ENEMY_WALK_SPEED = 1.12;
/**
 * Approximate horizontal radius of the messenger body for vehicle contact (world units).
 */
export const GOAL_ENEMY_BODY_XZ = 0.48;

/** True when the messenger’s XZ position overlaps the vehicle footprint at spawn. */
export function messengerTouchesVehicle(
  mx: number,
  mz: number,
  spawnX: number,
  spawnZ: number
): boolean {
  return (
    Math.hypot(mx - spawnX, mz - spawnZ) <
    VEHICLE_FOOTPRINT_HALF_XZ + GOAL_ENEMY_BODY_XZ
  );
}
