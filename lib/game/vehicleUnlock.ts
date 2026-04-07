import {
  DEFAULT_PLAYER_VEHICLE,
  getVehicleByVId,
  resolveVehicleFromUrlParam,
  type PlayerVehicleConfig,
} from "@/components/playerVehicleConfig";
import type { PlayerStatsState } from "@/lib/playerStats/types";

/** Premium textured hull (`data/defaultVehicles.json` v_id). */
export const PREMIUM_RATATA_VEHICLE_ID = "meshy-ratata";

/**
 * While `true`, the Ratata premium hull is free for everyone (beta).
 * Set to `false` when the beta ends — unlock will require `gamesWon >= 1`.
 */
export const RATATA_PREMIUM_BETA_FREE_UNLOCK = true;

/** Lifetime battle wins (`PlayerStatsState.gamesWon`) needed after beta ends. */
export const RATATA_UNLOCK_MIN_BATTLE_WINS = 1;

export function isPremiumRatataVehicleId(vehicleId: string): boolean {
  return vehicleId.trim().toLowerCase() === PREMIUM_RATATA_VEHICLE_ID;
}

export function isVehicleUnlocked(
  stats: PlayerStatsState,
  vehicleId: string
): boolean {
  if (!isPremiumRatataVehicleId(vehicleId)) return true;
  if (RATATA_PREMIUM_BETA_FREE_UNLOCK) return true;
  return stats.gamesWon >= RATATA_UNLOCK_MIN_BATTLE_WINS;
}

/**
 * Resolves URL vehicle selection and enforces premium unlock (falls back to default).
 */
export function resolvePlayerVehicle(
  vehicleParam: string | null | undefined,
  stats: PlayerStatsState
): PlayerVehicleConfig {
  const base = resolveVehicleFromUrlParam(vehicleParam);
  if (!isVehicleUnlocked(stats, base.id)) {
    return DEFAULT_PLAYER_VEHICLE;
  }
  return base;
}

export function shouldShowRatataBetaTag(): boolean {
  return RATATA_PREMIUM_BETA_FREE_UNLOCK;
}
