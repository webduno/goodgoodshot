"use client";

import {
  vehicleChargeMs,
  vehicleShotCooldownMs,
  type PlayerVehicleConfig,
} from "@/components/playerVehicleConfig";

import {
  hudFont,
  progressFillStyle,
  progressTrack,
} from "@/components/gameHudStyles";

import { PowerupSlotRow } from "@/components/game/cube/hud/PowerupSlotRow";
import type { PowerupSlotId } from "@/lib/game/types";

export function ShotHud({
  shotInFlight,
  cooldownUntil,
  chargeHud,
  strengthCharges,
  noBounceCharges,
  noBounceActive,
  onPowerup,
  vehicle,
}: {
  shotInFlight: boolean;
  cooldownUntil: number | null;
  chargeHud: { remainingMs: number; clicks: number } | null;
  strengthCharges: number;
  noBounceCharges: number;
  noBounceActive: boolean;
  onPowerup: (slotId: PowerupSlotId) => void;
  vehicle: PlayerVehicleConfig;
}) {
  const chargeMs = vehicleChargeMs(vehicle);
  const cooldownMs = vehicleShotCooldownMs(vehicle);
  const remainingMs =
    cooldownUntil !== null ? Math.max(0, cooldownUntil - Date.now()) : 0;
  const inCooldown = cooldownUntil !== null && remainingMs > 0;
  const progress =
    inCooldown && cooldownMs > 0 ? remainingMs / cooldownMs : 0;
  const charging = chargeHud !== null;
  const chargeProgress =
    charging && chargeMs > 0 ? chargeHud.remainingMs / chargeMs : 0;
  const canUseStrength =
    charging && !shotInFlight && strengthCharges > 0;
  const canUseNoBounce =
    charging && !shotInFlight && noBounceCharges > 0 && !noBounceActive;

  if (charging && !shotInFlight && chargeHud) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: 6,
          width: "100%",
          pointerEvents: "none",
          userSelect: "none",
          ...hudFont,
        }}
      >
        <div
          style={{
            pointerEvents: "auto",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <PowerupSlotRow
            strengthCharges={strengthCharges}
            noBounceCharges={noBounceCharges}
            canUseStrength={canUseStrength}
            canUseNoBounce={canUseNoBounce}
            onPowerup={onPowerup}
          />
        </div>
        <div style={{ ...progressTrack, overflow: "hidden" }}>
          <div style={progressFillStyle(chargeProgress, "charge")} />
        </div>
      </div>
    );
  }

  if (inCooldown && !shotInFlight && !charging) {
    return (
      <div
        style={{
          width: "100%",
          pointerEvents: "none",
          ...hudFont,
        }}
      >
        <div style={{ ...progressTrack, overflow: "hidden" }}>
          <div style={progressFillStyle(progress, "cooldown")} />
        </div>
      </div>
    );
  }

  return null;
}
