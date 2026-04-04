"use client";

import {
  launchStrengthFromClicks,
  type PlayerVehicleConfig,
} from "@/components/playerVehicleConfig";
import type { CSSProperties } from "react";

import {
  hudColors,
  hudMiniPanel,
} from "@/components/gameHudStyles";
import { formatVec3 } from "@/lib/game/math";
import type { Vec3 } from "@/lib/game/types";

import { HudIdleBoltIcon, HudIdleClockIcon } from "@/components/game/cube/hud/HudIdleIcons";

export function StatsHud({
  spawnCenter,
  sessionShots,
  chargeHud,
  shotInFlight,
  cooldownUntil,
  powerupCharges,
  powerupStackCount,
  vehicle,
}: {
  spawnCenter: Vec3;
  sessionShots: number;
  chargeHud: { remainingMs: number; clicks: number } | null;
  shotInFlight: boolean;
  cooldownUntil: number | null;
  powerupCharges: number;
  powerupStackCount: number;
  vehicle: PlayerVehicleConfig;
}) {
  const remainingMs =
    cooldownUntil !== null ? Math.max(0, cooldownUntil - Date.now()) : 0;
  const inCooldown = cooldownUntil !== null && remainingMs > 0;
  const charging = chargeHud !== null;
  const powerupMult = Math.pow(2, powerupStackCount);

  const metricsDivider: CSSProperties = {
    marginTop: 8,
    paddingTop: 8,
    borderTop: "1px solid rgba(0, 80, 110, 0.12)",
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        zIndex: 40,
        pointerEvents: "none",
        userSelect: "none",
        padding: "6px 8px",
        maxWidth: 220,
        ...hudMiniPanel,
        fontSize: 10,
        lineHeight: 1.4,
      }}
    >
      <div
        style={{
          color: hudColors.muted,
          marginBottom: 2,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        Shots (session)
      </div>
      <div
        style={{
          color: hudColors.value,
          fontWeight: 700,
          fontSize: 14,
          fontVariantNumeric: "tabular-nums",
          marginBottom: 10,
        }}
      >
        {sessionShots}
      </div>
      <div
        style={{
          color: hudColors.muted,
          marginBottom: 2,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        Vehicle
      </div>
      <div
        style={{
          color: hudColors.value,
          fontWeight: 600,
          fontSize: 10,
          marginBottom: 6,
        }}
      >
        {vehicle.name}
      </div>
      <div
        style={{
          color: hudColors.muted,
          marginBottom: 2,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        Position
      </div>
      <div
        style={{
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          color: hudColors.value,
          fontWeight: 600,
        }}
      >
        ({formatVec3(spawnCenter)})
      </div>

      {shotInFlight && (
        <div style={{ ...metricsDivider, color: hudColors.value, fontSize: 10 }}>
          Shot in flight…
        </div>
      )}

      {charging && !shotInFlight && chargeHud && (
        <div style={metricsDivider}>
          <div style={{ lineHeight: 1.35, fontSize: 9, color: hudColors.label }}>
            Time left:{" "}
            <strong
              style={{
                color: hudColors.value,
                fontVariantNumeric: "tabular-nums",
                fontWeight: 600,
              }}
            >
              {(chargeHud.remainingMs / 1000).toFixed(1)}
            </strong>
            s · Clicks:{" "}
            <strong
              style={{
                color: hudColors.accent,
                fontVariantNumeric: "tabular-nums",
                fontWeight: 600,
              }}
            >
              {chargeHud.clicks}
            </strong>
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 9,
              lineHeight: 1.35,
              color: hudColors.label,
            }}
          >
            Strength{" "}
            <strong
              style={{
                color: hudColors.value,
                fontVariantNumeric: "tabular-nums",
                fontWeight: 600,
              }}
            >
              {(
                launchStrengthFromClicks(chargeHud.clicks, vehicle) *
                powerupMult
              ).toFixed(2)}
            </strong>
            {powerupStackCount > 0 && (
              <span style={{ color: hudColors.accent }}> (×{powerupMult})</span>
            )}
            <span style={{ color: hudColors.muted }}>
              {" "}
              · +
              {Math.round(vehicle.extraClickStrengthFraction * 100)}% / extra
              click
            </span>
          </div>
        </div>
      )}

      {inCooldown && !shotInFlight && !charging && (
        <div style={{ ...metricsDivider, fontSize: 9, color: hudColors.label }}>
          Next shot in{" "}
          <strong
            style={{
              color: hudColors.value,
              fontVariantNumeric: "tabular-nums",
              fontWeight: 600,
            }}
          >
            {(remainingMs / 1000).toFixed(1)}
          </strong>
          s · Boost left: {powerupCharges}
        </div>
      )}

      {!shotInFlight && !inCooldown && !charging && (
        <div
          role="status"
          aria-label={`Charge window ${vehicle.secondsBeforeShotTrigger} seconds, ${powerupCharges} boost charges available`}
          style={{
            ...metricsDivider,
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: hudColors.muted,
            fontSize: 10,
            lineHeight: 1,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontVariantNumeric: "tabular-nums",
            }}
            title="Charge window length"
          >
            <HudIdleClockIcon color={hudColors.accent} />
            {vehicle.secondsBeforeShotTrigger}s
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontVariantNumeric: "tabular-nums",
            }}
            title="Boost charges left"
          >
            <HudIdleBoltIcon color={hudColors.accent} />
            {powerupCharges}
          </span>
        </div>
      )}
    </div>
  );
}
