/** Serializable pond layout for persistence / profile display. */
export type PondSnapshot = {
  worldX: number;
  worldZ: number;
  halfX: number;
  halfZ: number;
};

export type LastCompletedGame = {
  vehicleId: string;
  shots: number;
  ponds: PondSnapshot[];
  goalWorldX: number;
  goalWorldZ: number;
  strengthUses: number;
  noBounceUses: number;
  waterPenaltiesThisRound: number;
  completedAt: string;
};

export type PlayerStatsState = {
  gamesWon: number;
  totalShotsLifetime: number;
  totalStrengthPowerupsUsed: number;
  totalNoBouncePowerupsUsed: number;
  totalWaterPenalties: number;
  /** Lane bonus coins collected (lifetime). */
  totalGoldCoins: number;
  lastCompletedGame: LastCompletedGame | null;
};

export type HoleCompletedPayload = {
  vehicleId: string;
  shots: number;
  ponds: readonly { worldX: number; worldZ: number; halfX: number; halfZ: number }[];
  goalWorldX: number;
  goalWorldZ: number;
  strengthUses: number;
  noBounceUses: number;
  waterPenaltiesThisRound: number;
};
