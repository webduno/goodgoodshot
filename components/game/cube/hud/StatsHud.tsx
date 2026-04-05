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
import { WIND_ACCEL_MAX } from "@/lib/game/wind";

import { HudIdleBoltIcon, HudIdleClockIcon } from "@/components/game/cube/hud/HudIdleIcons";

export function StatsHud({
  spawnCenter,
  sessionShots,
  chargeHud,
  shotInFlight,
  cooldownUntil,
  strengthCharges,
  noBounceCharges,
  noWindCharges,
  powerupStackCount,
  noBounceActive,
  noWindActive,
  windHud,
  vehicle,
  totalGoldCoins,
}: {
  spawnCenter: Vec3;
  sessionShots: number;
  chargeHud: { remainingMs: number; clicks: number } | null;
  shotInFlight: boolean;
  cooldownUntil: number | null;
  strengthCharges: number;
  noBounceCharges: number;
  noWindCharges: number;
  powerupStackCount: number;
  noBounceActive: boolean;
  noWindActive: boolean;
  windHud: { x: number; z: number };
  vehicle: PlayerVehicleConfig;
  totalGoldCoins: number;
}) {
  const remainingMs =
    cooldownUntil !== null ? Math.max(0, cooldownUntil - Date.now()) : 0;
  const inCooldown = cooldownUntil !== null && remainingMs > 0;
  const charging = chargeHud !== null;
  const powerupMult = Math.pow(2, powerupStackCount);

  const windMag = Math.hypot(windHud.x, windHud.z);
  /** Meteorological convention: direction the wind comes from (opposite to acceleration). */
  const windFromAngleDeg =
    (Math.atan2(-windHud.z, -windHud.x) * 180) / Math.PI;
  const windArrowLen = 6 + (Math.min(windMag, WIND_ACCEL_MAX) / WIND_ACCEL_MAX) * 14;

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
        n°
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
          marginTop: 4,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        Gold coins
      </div>
      <div
        style={{
          color: "#b8860b",
          fontWeight: 700,
          fontSize: 13,
          fontVariantNumeric: "tabular-nums",
          marginBottom: 8,
        }}
      >
        {totalGoldCoins}
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
        Wind
      </div>
      <div
        role="img"
        aria-label={`Wind ${windMag.toFixed(2)} m/s² from ${windFromAngleDeg.toFixed(0)}° in world XZ (X ${windHud.x.toFixed(2)}, Z ${windHud.z.toFixed(2)})`}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          alignSelf: "flex-start",
          gap: 2,
          color: hudColors.value,
          marginBottom: 6,
        }}
      >
        <svg
          width={40}
          height={40}
          viewBox="0 0 40 40"
          aria-hidden
        >
          <g transform={`translate(20 20) rotate(${windFromAngleDeg})`}>
            <line
              x1={-windArrowLen * 0.15}
              y1={0}
              x2={windArrowLen * 0.65}
              y2={0}
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <polygon
              points={`${windArrowLen * 0.85},0 ${windArrowLen * 0.55},-4 ${windArrowLen * 0.55},4`}
              fill="currentColor"
            />
          </g>
        </svg>
        <span
          style={{
            fontVariantNumeric: "tabular-nums",
            fontWeight: 600,
            fontSize: 11,
            lineHeight: 1.2,
            whiteSpace: "nowrap",
          }}
        >
          {windMag.toFixed(2)}
        </span>
        <span
          style={{
            color: hudColors.muted,
            fontWeight: 500,
            fontSize: 9,
            lineHeight: 1.1,
          }}
        >
          m/s²
        </span>
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
          {noBounceActive && (
            <div
              style={{
                marginTop: 4,
                fontSize: 9,
                lineHeight: 1.35,
                color: hudColors.label,
              }}
            >
              No bounce / roll{" "}
              <strong style={{ color: hudColors.accent, fontWeight: 600 }}>
                on
              </strong>{" "}
              for this shot
            </div>
          )}
          {noWindActive && (
            <div
              style={{
                marginTop: 4,
                fontSize: 9,
                lineHeight: 1.35,
                color: hudColors.label,
              }}
            >
              No wind{" "}
              <strong style={{ color: hudColors.accent, fontWeight: 600 }}>
                on
              </strong>{" "}
              for this shot
            </div>
          )}
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
          s · Boost: Str {strengthCharges} · Nb {noBounceCharges} · Nw{" "}
          {noWindCharges}
        </div>
      )}

      {!shotInFlight && !inCooldown && !charging && (
        <div
          role="status"
          aria-label={`Charge window ${vehicle.secondsBeforeShotTrigger} seconds, ${strengthCharges} strength, ${noBounceCharges} no-bounce, ${noWindCharges} no-wind charges available`}
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
            title="Boost charges left (strength / no-bounce / no-wind)"
          >
            <HudIdleBoltIcon color={hudColors.accent} />
            {strengthCharges}/{noBounceCharges}/{noWindCharges}
          </span>
        </div>
      )}
    </div>
  );
}
