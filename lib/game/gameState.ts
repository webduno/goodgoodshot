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
import { pickMapCages } from "./mapCages";
import { pickPondsLayout } from "./pondLayout";
import { isValidBiomeId } from "./biomes";
import {
  INITIAL_LANE_ORIGIN,
  type BiomeId,
  type GameAction,
  type GameState,
  type GoalEnemySpec,
  type Vec3,
} from "./types";
import {
  randomIntInclusive,
  snapBlockCenterToGrid,
  withSeededRNG,
} from "./math";

/** Blue, green, yellow, red — random picks per messenger in a battle. */
const GOAL_ENEMY_COLOR_PALETTE = [
  "#0099ff",
  "#22c55e",
  "#eab308",
  "#ef4444",
] as const;

/** War battle index `i` (0-based) uses `i + 1` messengers with random palette colors. */
export function createGoalEnemySpecsForBattle(battleIndex: number): readonly GoalEnemySpec[] {
  const count = battleIndex + 1;
  return Array.from({ length: count }, () => ({
    colorHex:
      GOAL_ENEMY_COLOR_PALETTE[
        Math.floor(Math.random() * GOAL_ENEMY_COLOR_PALETTE.length)
      ]!,
  }));
}

/** Same layout rules as `createInitialGameState`, but fully determined by `courseSeed` (multiplayer parity). */
export function createInitialGameStateFromSeed(
  courseSeed: number,
  opts?: {
    biome?: BiomeId;
    goalEnemies?: readonly GoalEnemySpec[];
  }
): GameState {
  return withSeededRNG(courseSeed, () =>
    createInitialGameState({
      biome: opts?.biome ?? "plain",
      goalEnemies: opts?.goalEnemies ?? [{ colorHex: "#e11d48" }],
    })
  );
}

export function createInitialGameState(opts?: {
  biome?: BiomeId;
  goalEnemies?: readonly GoalEnemySpec[];
}): GameState {
  const biome: BiomeId = opts?.biome ?? "plain";
  const goalEnemies = opts?.goalEnemies ?? [{ colorHex: "#0099ff" }];
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
  const mapCages = pickMapCages(islands, spawnCenter, goalCenter, ponds, 2);
  return {
    spawnCenter,
    goalWorldZ,
    goalWorldX,
    ponds,
    islands,
    miniVillage,
    biome,
    goalEnemies,
    mapCages,
  };
}

/**
 * Ensures `biome`, `goalEnemies`, and `mapCages` exist when hydrating from JSON (older saves).
 * `mapCages` is part of `GameState` like `islands` (serialized in war session `maps[]`); legacy payloads
 * without it get new random cages so traps match the stored course layout.
 */
export function withDefaultBiome(state: GameState): GameState {
  let next = state;
  if (!isValidBiomeId(state.biome)) {
    next = { ...next, biome: "plain" };
  }
  if (!Array.isArray(next.goalEnemies)) {
    next = { ...next, goalEnemies: [{ colorHex: "#0099ff" }] };
  }
  if (!Array.isArray(next.mapCages)) {
    next = { ...next, mapCages: [] };
  }
  if (next.mapCages.length === 0 && next.islands.length > 0) {
    const goalCenter: Vec3 = [
      next.goalWorldX,
      INITIAL_LANE_ORIGIN[1],
      next.goalWorldZ,
    ];
    next = {
      ...next,
      mapCages: pickMapCages(
        next.islands,
        next.spawnCenter,
        goalCenter,
        next.ponds,
        2
      ),
    };
  }
  return next;
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === "REPLACE_GAME_STATE") {
    return withDefaultBiome(action.state);
  }
  if (action.type !== "PROJECTILE_END") return state;

  const prev = state.spawnCenter;
  let next: Vec3;
  let nextGoalWorldZ = state.goalWorldZ;
  let nextGoalWorldX = state.goalWorldX;
  let nextPonds = state.ponds;

  let nextIslands = state.islands;
  let nextMiniVillage = state.miniVillage;
  let nextMapCages = state.mapCages;

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
    nextMapCages = pickMapCages(nextIslands, next, goalCenter, nextPonds, 2);
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
    goalEnemies: state.goalEnemies,
    mapCages: nextMapCages,
  };
}
