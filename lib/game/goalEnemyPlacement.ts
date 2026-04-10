import type { IslandRect } from "@/lib/game/islands";
import type { Vec3 } from "@/lib/game/types";

/** Spread messengers along X when more enemies than distinct islands (fallback). */
export function goalEnemyCrowdOffset(
  index: number,
  total: number
): { x: number; z: number } {
  if (total <= 1) return { x: 0, z: 0 };
  const step = 0.58;
  const mid = (total - 1) / 2;
  return { x: (index - mid) * step, z: 0 };
}

/**
 * World offset from `goalCenter` so each messenger spawns on a different island when possible.
 * Islands are ordered spawn → goal; index 0 uses the goal island, 1 the previous, etc.
 * Matches `GoalMessengerCharacter` anchor `(goalCenter + offset) + (0.35, -0.85)` ≡ island center + (0.35, -0.85).
 * When `total` exceeds `islands.length`, extras share the goal island with crowding vs index 0.
 */
export function goalEnemySpawnOffsetXZ(
  islands: readonly IslandRect[],
  goalCenter: Vec3,
  index: number,
  total: number
): { x: number; z: number } {
  if (total <= 1) return { x: 0, z: 0 };
  if (islands.length === 0) return goalEnemyCrowdOffset(index, total);

  const goalIsland = islands[islands.length - 1]!;
  const baseOnGoal = {
    x: goalIsland.worldX - goalCenter[0],
    z: goalIsland.worldZ - goalCenter[2],
  };

  const onGoalCount =
    total > islands.length ? total - islands.length + 1 : 1;

  if (index === 0) {
    const crowd = goalEnemyCrowdOffset(0, onGoalCount);
    return {
      x: baseOnGoal.x + crowd.x,
      z: baseOnGoal.z + crowd.z,
    };
  }
  if (index >= islands.length) {
    const k = index - islands.length + 1;
    const crowd = goalEnemyCrowdOffset(k, onGoalCount);
    return {
      x: baseOnGoal.x + crowd.x,
      z: baseOnGoal.z + crowd.z,
    };
  }
  const is = islands[islands.length - 1 - index]!;
  return {
    x: is.worldX - goalCenter[0],
    z: is.worldZ - goalCenter[2],
  };
}
