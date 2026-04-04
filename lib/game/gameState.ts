import {
  GOAL_X_MAX,
  GOAL_X_MIN,
  GOAL_Z_MAX,
  GOAL_Z_MIN,
} from "./constants";
import { pickPondsLayout } from "./pondLayout";
import type { GameAction, GameState, Vec3 } from "./types";
import { randomIntInclusive, snapBlockCenterToGrid } from "./math";

export function createInitialGameState(): GameState {
  const goalWorldZ = randomIntInclusive(GOAL_Z_MIN, GOAL_Z_MAX);
  const goalWorldX = randomIntInclusive(GOAL_X_MIN, GOAL_X_MAX);
  const spawnX = 0;
  const spawnZ = 0;
  const ponds = pickPondsLayout(spawnX, spawnZ, goalWorldX, goalWorldZ);
  return {
    spawnCenter: [0, 0, 0],
    goalWorldZ,
    goalWorldX,
    ponds,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type !== "PROJECTILE_END") return state;

  const prev = state.spawnCenter;
  let next: Vec3;
  let nextGoalWorldZ = state.goalWorldZ;
  let nextGoalWorldX = state.goalWorldX;
  let nextPonds = state.ponds;

  if (action.outcome === "hit") {
    next = snapBlockCenterToGrid([
      prev[0],
      prev[1],
      state.goalWorldZ,
    ]);
    nextGoalWorldZ = next[2] + randomIntInclusive(GOAL_Z_MIN, GOAL_Z_MAX);
    nextGoalWorldX = randomIntInclusive(GOAL_X_MIN, GOAL_X_MAX);
    nextPonds = pickPondsLayout(
      next[0],
      next[2],
      nextGoalWorldX,
      nextGoalWorldZ
    );
  } else if (action.outcome === "penalty" && action.revertSpawn) {
    next = snapBlockCenterToGrid(action.revertSpawn);
  } else if (action.landing) {
    next = snapBlockCenterToGrid(action.landing);
  } else {
    next = prev;
  }

  return {
    ...state,
    spawnCenter: next,
    goalWorldZ: nextGoalWorldZ,
    goalWorldX: nextGoalWorldX,
    ponds: nextPonds,
  };
}
