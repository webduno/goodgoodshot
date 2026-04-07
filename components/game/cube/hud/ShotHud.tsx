"use client";

import {
  launchStrengthFromClicks,
  maxClicksForStrengthBarRef,
  vehicleChargeMs,
  vehicleShotCooldownMs,
  type PlayerVehicleConfig,
} from "@/components/playerVehicleConfig";

import {
  hudColors,
  hudFont,
  progressFillStyle,
  progressFillStyleVertical,
  progressTrack,
  progressTrackVerticalStrength,
} from "@/components/gameHudStyles";

function strengthBarRefBounds(v: PlayerVehicleConfig) {
  const maxClicksRef = maxClicksForStrengthBarRef(v);
  const sMin = launchStrengthFromClicks(1, v);
  const sMaxRef = launchStrengthFromClicks(maxClicksRef, v);
  return { maxClicksRef, sMin, sMaxRef };
}

/** Fill 0→1: bonus launch strength from extra taps vs a reference max tap count for this charge window. */
function strengthBarRatio(clicks: number, v: PlayerVehicleConfig): number {
  const { sMin, sMaxRef } = strengthBarRefBounds(v);
  const sCur = launchStrengthFromClicks(clicks, v);
  if (sMaxRef <= sMin) return 0;
  return Math.min(1, Math.max(0, (sCur - sMin) / (sMaxRef - sMin)));
}

/** Base launch strength above the bar’s reference cap (same units as `launchStrengthFromClicks`). */
function strengthBeyondBarRef(clicks: number, v: PlayerVehicleConfig): number {
  const { sMaxRef } = strengthBarRefBounds(v);
  const sCur = launchStrengthFromClicks(clicks, v);
  return Math.max(0, sCur - sMaxRef);
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

/** Vertical shot power fill — placed above the Hold to shoot button (right dock). */
export function FirePowerVerticalHud({
  shotInFlight,
  chargeHud,
  vehicle,
  powerupStackCount = 0,
}: {
  shotInFlight: boolean;
  chargeHud: { remainingMs: number; clicks: number } | null;
  vehicle: PlayerVehicleConfig;
  /** Strength power-up stacks (×2 each) — overflow readout matches StatsHud. */
  powerupStackCount?: number;
}) {
  const charging = chargeHud !== null;
  if (!charging || shotInFlight || !chargeHud) return null;

  const strengthPct = strengthBarRatio(chargeHud.clicks, vehicle);
  const beyondBase = strengthBeyondBarRef(chargeHud.clicks, vehicle);
  const powerMult = Math.pow(2, powerupStackCount);
  const beyondEffective = beyondBase * powerMult;
  const showOverflow = beyondEffective >= 0.005;

  const overflowReadoutStyle = {
    fontSize: 11,
    fontWeight: 800,
    lineHeight: 1.1,
    color: hudColors.accent,
    fontVariantNumeric: "tabular-nums" as const,
    textAlign: "center" as const,
    backgroundColor: "#fff",
    padding: "3px 6px",
    borderRadius: 3,
    WebkitTextStroke: "0.55px rgba(255,255,255,0.95)",
    paintOrder: "stroke fill" as const,
    textShadow: [
      "0 0 1px rgba(255,255,255,0.9)",
      "0 1px 2px rgba(0, 45, 75, 0.45)",
      "1px 0 0 rgba(255,255,255,0.35)",
      "-1px 0 0 rgba(255,255,255,0.35)",
      "0 -1px 0 rgba(255,255,255,0.35)",
    ].join(", "),
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        pointerEvents: "none",
        userSelect: "none",
        ...hudFont,
      }}
    >
      {showOverflow && (
        <div
          aria-label={`Strength over bar cap: plus ${beyondEffective.toFixed(2)}`}
          style={overflowReadoutStyle}
        >
          +{beyondEffective.toFixed(2)}
        </div>
      )}
      <div
        style={{
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: "0.04em",
          color: hudColors.label,
          textTransform: "uppercase",
          textAlign: "center",
          lineHeight: 1.15,
          maxWidth: 56,
          backgroundColor: "#fff",
          padding: "3px 6px",
          borderRadius: 3,
        }}
      >
        Shot
        <br />
        power
      </div>
      <div style={progressTrackVerticalStrength}>
        <div style={progressFillStyleVertical(strengthPct, "strength")} />
      </div>
    </div>
  );
}
