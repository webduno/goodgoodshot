"use client";

import { useEffect, useMemo, useState } from "react";
import type { PlayerVehicleConfig } from "@/components/playerVehicleConfig";
import {
  readPreferredVehicleId,
  writePreferredVehicleId,
} from "@/lib/game/preferredVehicleStorage";
import type { PlayerStatsState } from "@/lib/playerStats/types";
import {
  effectiveVehicleParam,
  resolvePlayerVehicle,
} from "@/lib/game/vehicleUnlock";

/**
 * Resolves `?vehicle=` with localStorage fallback and persists the unlocked vehicle
 * the player actually uses (URL, picker, or stored preference).
 */
export function useResolvedPlayerVehicle(
  vehicleParam: string | null,
  stats: PlayerStatsState,
  ownedVehicleIds: readonly string[] | undefined
): {
  playerVehicle: PlayerVehicleConfig;
  /** True after localStorage preference has been read (needed before trusting URL-less resolution). */
  preferenceHydrated: boolean;
} {
  const [storedId, setStoredId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStoredId(readPreferredVehicleId());
    setHydrated(true);
  }, []);

  const effective = useMemo(
    () => effectiveVehicleParam(vehicleParam, storedId),
    [vehicleParam, storedId]
  );

  const playerVehicle = useMemo(
    () => resolvePlayerVehicle(effective, stats, ownedVehicleIds),
    [effective, stats, ownedVehicleIds]
  );

  useEffect(() => {
    if (!hydrated) return;
    writePreferredVehicleId(playerVehicle.id);
  }, [hydrated, playerVehicle.id]);

  return { playerVehicle, preferenceHydrated: hydrated };
}
