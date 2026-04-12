import {
  DEFAULT_V_ID,
  resolveVehicleFromUrlParam,
} from "@/components/playerVehicleConfig";
import {
  clearSessionBattleMaps,
  generateSessionBattleMaps,
  saveSessionBattleMaps,
  type SessionBiomeChoice,
} from "@/lib/game/sessionBattleMaps";
import { readPreferredVehicleId } from "@/lib/game/preferredVehicleStorage";
import {
  defaultPlaySession,
  savePlaySession,
  type SessionBattleCount,
} from "@/lib/game/playSession";
import { effectiveVehicleParam } from "@/lib/game/vehicleUnlock";

/** After war end → new war + reload, skip the start modal on the next load (same as `CubeScene`). */
export const SESSION_SKIP_START_MODAL_KEY = "goodgoodshot.skipStartModal";

/**
 * Persists a new war session (maps + play session) and navigates to home so `CubeScene` loads it.
 * Preserves `?vehicle=` from the current URL when present.
 * When `options.vehicleParam` is set (including `null` for default), it overrides URL + stored preference for the redirect.
 */
export function startWarSessionAndRedirectHome(
  battleCount: SessionBattleCount,
  biomeChoice: SessionBiomeChoice,
  options?: { vehicleParam?: string | null }
): void {
  if (typeof window === "undefined") return;

  clearSessionBattleMaps();
  const next = defaultPlaySession(battleCount);
  const maps = generateSessionBattleMaps(battleCount, biomeChoice);
  saveSessionBattleMaps({
    startedAtMs: next.startedAtMs,
    targetBattles: battleCount,
    maps,
  });
  savePlaySession(next);

  try {
    sessionStorage.setItem(SESSION_SKIP_START_MODAL_KEY, "1");
  } catch {
    /* ignore */
  }

  const url = new URL("/", window.location.origin);
  const fromUrl = new URLSearchParams(window.location.search).get("vehicle");
  const stored = readPreferredVehicleId();
  const effective =
    options?.vehicleParam !== undefined
      ? options.vehicleParam
      : effectiveVehicleParam(fromUrl, stored);
  const cfg = resolveVehicleFromUrlParam(effective);
  if (cfg.id !== DEFAULT_V_ID) {
    url.searchParams.set("vehicle", cfg.id);
  }
  window.location.assign(url.toString());
}
