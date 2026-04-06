import {
  GOAL_X_MAX,
  GOAL_X_MIN,
  GOAL_Z_MAX,
  GOAL_Z_MIN,
} from "./constants";
import {
  computeIslandsForLane,
  ensureSpawnAndGoalOnIslandsImmutable,
} from "./islands";
import { pickPondsLayout } from "./pondLayout";
import {
  INITIAL_LANE_ORIGIN,
  type BiomeId,
  type GameAction,
  type GameState,
  type Vec3,
} from "./types";
import { randomIntInclusive, snapBlockCenterToGrid } from "./math";

export function createInitialGameState(opts?: { biome?: BiomeId }): GameState {
  const biome: BiomeId = opts?.biome ?? "plain";
  const goalWorldZ = randomIntInclusive(GOAL_Z_MIN, GOAL_Z_MAX);
  const goalWorldX = randomIntInclusive(GOAL_X_MIN, GOAL_X_MAX);
  const spawnX = 0;
  const spawnZ = 0;
  const ponds = pickPondsLayout(spawnX, spawnZ, goalWorldX, goalWorldZ);
  const spawnCenter: Vec3 = [0, 0, 0];
  const goalCenter: Vec3 = [
    goalWorldX,
    INITIAL_LANE_ORIGIN[1],
    goalWorldZ,
  ];
  const { islands, miniVillage } = computeIslandsForLane(
    INITIAL_LANE_ORIGIN,
    goalCenter,
    spawnCenter
  );
  return {
    spawnCenter,
    goalWorldZ,
    goalWorldX,
    ponds,
    islands,
    miniVillage,
    biome,
  };
}

/** Ensures `biome` exists when hydrating from JSON (older saves). */
export function withDefaultBiome(state: GameState): GameState {
  if (state.biome === "desert" || state.biome === "plain") return state;
  return { ...state, biome: "plain" };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === "REPLACE_GAME_STATE") {
    return action.state;
  }
  if (action.type !== "PROJECTILE_END") return state;

  const prev = state.spawnCenter;
  let next: Vec3;
  let nextGoalWorldZ = state.goalWorldZ;
  let nextGoalWorldX = state.goalWorldX;
  let nextPonds = state.ponds;

  let nextIslands = state.islands;
  let nextMiniVillage = state.miniVillage;

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
    const goalCenter: Vec3 = [
      nextGoalWorldX,
      INITIAL_LANE_ORIGIN[1],
      nextGoalWorldZ,
    ];
    const lane = computeIslandsForLane(INITIAL_LANE_ORIGIN, goalCenter, next);
    nextIslands = lane.islands;
    nextMiniVillage = lane.miniVillage;
  } else if (action.outcome === "penalty" && action.revertSpawn) {
    next = snapBlockCenterToGrid(action.revertSpawn);
    const goalCenter: Vec3 = [
      state.goalWorldX,
      INITIAL_LANE_ORIGIN[1],
      state.goalWorldZ,
    ];
    nextIslands = ensureSpawnAndGoalOnIslandsImmutable(
      state.islands,
      next,
      goalCenter
    );
  } else if (action.landing) {
    next = snapBlockCenterToGrid(action.landing);
    const goalCenter: Vec3 = [
      state.goalWorldX,
      INITIAL_LANE_ORIGIN[1],
      state.goalWorldZ,
    ];
    nextIslands = ensureSpawnAndGoalOnIslandsImmutable(
      state.islands,
      next,
      goalCenter
    );
  } else {
    next = prev;
  }

  return {
    ...state,
    spawnCenter: next,
    goalWorldZ: nextGoalWorldZ,
    goalWorldX: nextGoalWorldX,
    ponds: nextPonds,
    islands: nextIslands,
    miniVillage: nextMiniVillage,
    biome: state.biome,
  };
}
