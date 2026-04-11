import {
  DEFAULT_PLAYER_VEHICLE,
  DEFAULT_V_ID,
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

function isVehicleOwnedInShop(
  vehicleId: string,
  ownedVehicleIds: readonly string[] | undefined
): boolean {
  if (!ownedVehicleIds || ownedVehicleIds.length === 0) return false;
  const needle = vehicleId.trim().toLowerCase();
  return ownedVehicleIds.some((id) => id.trim().toLowerCase() === needle);
}

/**
 * @param ownedVehicleIds — from `PlayerShopInventory.ownedVehicleIds` (excludes free `default`).
 */
export function isVehicleUnlocked(
  stats: PlayerStatsState,
  vehicleId: string,
  ownedVehicleIds?: readonly string[]
): boolean {
  const id = vehicleId.trim().toLowerCase();
  if (id === DEFAULT_V_ID) return true;
  if (isVehicleOwnedInShop(vehicleId, ownedVehicleIds)) return true;
  if (isPremiumRatataVehicleId(vehicleId)) {
    if (RATATA_PREMIUM_BETA_FREE_UNLOCK) return true;
    return stats.gamesWon >= RATATA_UNLOCK_MIN_BATTLE_WINS;
  }
  return false;
}

/**
 * When the URL has no `vehicle` query (or empty), fall back to the last saved preference.
 * If the URL has a non-empty `vehicle` value, that wins.
 */
export function effectiveVehicleParam(
  urlParam: string | null | undefined,
  storedId: string | null | undefined
): string | null {
  const u = urlParam?.trim() ?? "";
  if (u !== "") return u;
  const s = storedId?.trim() ?? "";
  if (s !== "") return s;
  return null;
}

/**
 * Resolves URL vehicle selection and enforces premium unlock (falls back to default).
 */
export function resolvePlayerVehicle(
  vehicleParam: string | null | undefined,
  stats: PlayerStatsState,
  ownedVehicleIds?: readonly string[]
): PlayerVehicleConfig {
  const base = resolveVehicleFromUrlParam(vehicleParam);
  if (!isVehicleUnlocked(stats, base.id, ownedVehicleIds)) {
    return DEFAULT_PLAYER_VEHICLE;
  }
  return base;
}

export function shouldShowRatataBetaTag(): boolean {
  return RATATA_PREMIUM_BETA_FREE_UNLOCK;
}

/** Short hint when a vehicle row is locked in the vehicle picker. */
export function lockedVehicleSelectionHint(
  vehicleId: string,
  stats: PlayerStatsState,
  ownedVehicleIds: readonly string[]
): string {
  if (isVehicleUnlocked(stats, vehicleId, ownedVehicleIds)) return "";
  if (isPremiumRatataVehicleId(vehicleId) && !RATATA_PREMIUM_BETA_FREE_UNLOCK) {
    return "Win 1 battle or buy in the plaza shop";
  }
  return "Buy in the plaza shop";
}
