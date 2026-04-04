import type {
  HoleCompletedPayload,
  LastCompletedGame,
  PlayerStatsState,
} from "./types";

export const PLAYER_STATS_STORAGE_KEY = "goodgoodshot.playerStats.v1";

export function defaultPlayerStats(): PlayerStatsState {
  return {
    gamesWon: 0,
    totalShotsLifetime: 0,
    totalStrengthPowerupsUsed: 0,
    totalNoBouncePowerupsUsed: 0,
    totalWaterPenalties: 0,
    totalGoldCoins: 0,
    lastCompletedGame: null,
  };
}

function isPondSnapshot(
  x: unknown
): x is LastCompletedGame["ponds"][number] {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.worldX === "number" &&
    typeof o.worldZ === "number" &&
    typeof o.halfX === "number" &&
    typeof o.halfZ === "number"
  );
}

function isLastCompletedGame(x: unknown): x is LastCompletedGame {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (
    typeof o.vehicleId !== "string" ||
    typeof o.shots !== "number" ||
    typeof o.goalWorldX !== "number" ||
    typeof o.goalWorldZ !== "number" ||
    typeof o.strengthUses !== "number" ||
    typeof o.noBounceUses !== "number" ||
    typeof o.waterPenaltiesThisRound !== "number" ||
    typeof o.completedAt !== "string" ||
    !Array.isArray(o.ponds)
  ) {
    return false;
  }
  return o.ponds.every(isPondSnapshot);
}

export function loadPlayerStats(): PlayerStatsState {
  if (typeof window === "undefined") return defaultPlayerStats();
  try {
    const raw = localStorage.getItem(PLAYER_STATS_STORAGE_KEY);
    if (!raw) return defaultPlayerStats();
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return defaultPlayerStats();
    const p = parsed as Record<string, unknown>;
    const base = defaultPlayerStats();
    const gamesWon = typeof p.gamesWon === "number" ? p.gamesWon : base.gamesWon;
    const totalShotsLifetime =
      typeof p.totalShotsLifetime === "number"
        ? p.totalShotsLifetime
        : base.totalShotsLifetime;
    const totalStrengthPowerupsUsed =
      typeof p.totalStrengthPowerupsUsed === "number"
        ? p.totalStrengthPowerupsUsed
        : base.totalStrengthPowerupsUsed;
    const totalNoBouncePowerupsUsed =
      typeof p.totalNoBouncePowerupsUsed === "number"
        ? p.totalNoBouncePowerupsUsed
        : base.totalNoBouncePowerupsUsed;
    const totalWaterPenalties =
      typeof p.totalWaterPenalties === "number"
        ? p.totalWaterPenalties
        : base.totalWaterPenalties;
    const totalGoldCoins =
      typeof p.totalGoldCoins === "number"
        ? p.totalGoldCoins
        : base.totalGoldCoins;
    const lastCompletedGame =
      p.lastCompletedGame === null
        ? null
        : isLastCompletedGame(p.lastCompletedGame)
          ? p.lastCompletedGame
          : base.lastCompletedGame;
    return {
      gamesWon,
      totalShotsLifetime,
      totalStrengthPowerupsUsed,
      totalNoBouncePowerupsUsed,
      totalWaterPenalties,
      totalGoldCoins,
      lastCompletedGame,
    };
  } catch {
    return defaultPlayerStats();
  }
}

export function savePlayerStats(state: PlayerStatsState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PLAYER_STATS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}

export function mergeHoleCompleted(
  prev: PlayerStatsState,
  payload: HoleCompletedPayload
): PlayerStatsState {
  const ponds: LastCompletedGame["ponds"] = payload.ponds.map((pond) => ({
    worldX: pond.worldX,
    worldZ: pond.worldZ,
    halfX: pond.halfX,
    halfZ: pond.halfZ,
  }));
  const completedAt = new Date().toISOString();
  return {
    gamesWon: prev.gamesWon + 1,
    totalShotsLifetime: prev.totalShotsLifetime + payload.shots,
    totalStrengthPowerupsUsed:
      prev.totalStrengthPowerupsUsed + payload.strengthUses,
    totalNoBouncePowerupsUsed:
      prev.totalNoBouncePowerupsUsed + payload.noBounceUses,
    totalWaterPenalties:
      prev.totalWaterPenalties + payload.waterPenaltiesThisRound,
    totalGoldCoins: prev.totalGoldCoins,
    lastCompletedGame: {
      vehicleId: payload.vehicleId,
      shots: payload.shots,
      ponds,
      goalWorldX: payload.goalWorldX,
      goalWorldZ: payload.goalWorldZ,
      strengthUses: payload.strengthUses,
      noBounceUses: payload.noBounceUses,
      waterPenaltiesThisRound: payload.waterPenaltiesThisRound,
      completedAt,
    },
  };
}
