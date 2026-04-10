import { ensureSpawnAndGoalOnIslandsImmutable } from "./islands";
import {
  INITIAL_LANE_ORIGIN,
  type GameAction,
  type GameState,
  type Vec3,
} from "./types";
import { snapBlockCenterToGrid } from "./math";
import { withDefaultBiome } from "./gameState";

/**
 * Solo `gameReducer` advances the hole on goal hit. In PvP, a goal hit ends the match (handled via Supabase);
 * we do not reroll the course on hit.
 */
export function pvpGameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === "REPLACE_GAME_STATE") {
    return withDefaultBiome(action.state);
  }
  if (action.type !== "PROJECTILE_END") return state;

  if (action.outcome === "hit" || action.outcome === "enemy_loss") {
    return state;
  }

  const prev = state.spawnCenter;
  let next: Vec3;
  let nextGoalWorldZ = state.goalWorldZ;
  let nextGoalWorldX = state.goalWorldX;
  let nextPonds = state.ponds;

  let nextIslands = state.islands;
  let nextMiniVillage = state.miniVillage;
  let nextMapCages = state.mapCages;

  if (action.outcome === "penalty" && action.revertSpawn) {
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
