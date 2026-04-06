"use client";

import {
  launchStrengthFromClicks,
  vehicleChargeMs,
  vehicleShotCooldownMs,
  type PlayerVehicleConfig,
} from "@/components/playerVehicleConfig";

import {
  hudFont,
  progressFillStyle,
  progressTrack,
  progressTrackStrength,
} from "@/components/gameHudStyles";

/** Fill 0→1: bonus launch strength from extra taps vs a reference max tap count for this charge window. */
function strengthBarRatio(clicks: number, v: PlayerVehicleConfig): number {
  const maxClicksRef = Math.max(
    2,
    Math.round(v.secondsBeforeShotTrigger * 6) + 1
  );
  const sMin = launchStrengthFromClicks(1, v);
  const sMaxRef = launchStrengthFromClicks(maxClicksRef, v);
  const sCur = launchStrengthFromClicks(clicks, v);
  if (sMaxRef <= sMin) return 0;
  return Math.min(1, Math.max(0, (sCur - sMin) / (sMaxRef - sMin)));
}

export function ShotHud({
  shotInFlight,
  cooldownUntil,
  chargeHud,
  vehicle,
}: {
  shotInFlight: boolean;
  cooldownUntil: number | null;
  chargeHud: { remainingMs: number; clicks: number } | null;
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

  if (charging && !shotInFlight && chargeHud) {
    const strengthPct = strengthBarRatio(chargeHud.clicks, vehicle);
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          width: "fit-content",
          pointerEvents: "none",
          userSelect: "none",
          ...hudFont,
        }}
      >
        <div style={{ ...progressTrackStrength, overflow: "hidden" }}>
          <div style={progressFillStyle(strengthPct, "strength")} />
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
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "fit-content",
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
