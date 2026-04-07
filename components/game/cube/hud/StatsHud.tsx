"use client";

import {
  launchStrengthFromClicks,
  rgbTupleToCss,
  type PlayerVehicleConfig,
} from "@/components/playerVehicleConfig";
import { useState, type CSSProperties } from "react";

import { hudColors, hudFont, hudMiniPanel } from "@/components/gameHudStyles";
import { WIND_ACCEL_MAX } from "@/lib/game/wind";

import { HudIdleClockIcon } from "@/components/game/cube/hud/HudIdleIcons";

export function StatsHud({
  holePar,
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
  sessionScoreDisplay,
  onScoreClick,
}: {
  /** Max strokes (inclusive) to count as a battle win when you hole out — same as lane bonus coin count. */
  holePar: number;
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
  /** e.g. `2/9(45)` — wins / games in session (strokes, incl. current hole). */
  sessionScoreDisplay: string;
  onScoreClick: () => void;
}) {
  const [vehicleOpen, setVehicleOpen] = useState(false);

  const remainingMs =
    cooldownUntil !== null ? Math.max(0, cooldownUntil - Date.now()) : 0;
  const inCooldown = cooldownUntil !== null && remainingMs > 0;
  const charging = chargeHud !== null;
  const powerupMult = Math.pow(2, powerupStackCount);

  const windMag = Math.hypot(windHud.x, windHud.z);
  const windPercentOfMax =
    WIND_ACCEL_MAX > 0 ? (windMag / WIND_ACCEL_MAX) * 100 : 0;
  /** Meteorological convention: direction the wind comes from (opposite to acceleration). */
  const windFromAngleDeg =
    (Math.atan2(-windHud.z, -windHud.x) * 180) / Math.PI;
  const windArrowLen = 6 + (Math.min(windMag, WIND_ACCEL_MAX) / WIND_ACCEL_MAX) * 14;

  const mainCss = rgbTupleToCss(vehicle.mainRgb);
  const accentCss = rgbTupleToCss(vehicle.accentRgb);
  const baseLaunchStrength = launchStrengthFromClicks(1, vehicle);

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
        display: "flex",
        flexDirection: "column",
        gap: 8,
        alignItems: "flex-start",
        width: "fit-content",
        maxWidth: "min(94vw, 168px)",
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          ...hudFont,
          fontSize: 10,
          lineHeight: 1.4,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,0.88)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.45), 0 3px 10px rgba(0, 55, 95, 0.2)",
          backgroundImage: [
            "linear-gradient(165deg, rgba(255,255,255,0.42) 0%, transparent 46%)",
            `linear-gradient(135deg, ${mainCss} 0%, ${accentCss} 100%)`,
          ].join(", "),
        }}
      >
        <button
          type="button"
          id="hud-vehicle-toggle"
          aria-expanded={vehicleOpen}
          aria-controls="hud-vehicle-details"
          onClick={() => setVehicleOpen((o) => !o)}
          style={{
            width: "100%",
            margin: 0,
            padding: "6px 8px",
            border: "none",
            borderRadius: vehicleOpen ? "14px 14px 0 0" : 14,
            background: "transparent",
            cursor: "pointer",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            ...hudFont,
          }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.88)",
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              textShadow: "0 1px 2px rgba(0,0,0,0.35)",
            }}
          >
            Vehicle
          </span>
          <span
            aria-hidden
            style={{
              flexShrink: 0,
              color: "rgba(255,255,255,0.92)",
              fontSize: 12,
              lineHeight: 1,
              textShadow: "0 1px 2px rgba(0,0,0,0.35)",
            }}
          >
            {vehicleOpen ? "▼" : "▶"}
          </span>
        </button>
        {vehicleOpen ? (
          <div
            id="hud-vehicle-details"
            role="region"
            aria-labelledby="hud-vehicle-toggle"
            style={{ padding: "0 8px 8px" }}
          >
            <div
              style={{
                color: "rgba(255,255,255,0.88)",
                marginBottom: 2,
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                textShadow: "0 1px 2px rgba(0,0,0,0.35)",
              }}
            >
              Strength
            </div>
            <div
              role="status"
              aria-label={`Base launch strength ${baseLaunchStrength.toFixed(2)}`}
              title="Launch strength on the first tap in the charge window; hold Fire, Space, or the rear button to ramp clicks"
              style={{
                color: "#ffffff",
                fontWeight: 700,
                fontSize: 12,
                fontVariantNumeric: "tabular-nums",
                textShadow: "0 1px 2px rgba(0,0,0,0.45)",
                marginBottom: 2,
              }}
            >
              {baseLaunchStrength.toFixed(2)}
            </div>
            <div
              role="status"
              aria-label={`Charge window ${vehicle.secondsBeforeShotTrigger} seconds`}
              style={{
                marginTop: 8,
                paddingTop: 8,
                borderTop: "1px solid rgba(255,255,255,0.28)",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                color: "rgba(255,255,255,0.95)",
                fontSize: 10,
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
                textShadow: "0 1px 2px rgba(0,0,0,0.35)",
              }}
              title="Charge window length"
            >
              <HudIdleClockIcon color="rgba(255,255,255,0.95)" />
              {vehicle.secondsBeforeShotTrigger}s
            </div>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onScoreClick}
        title="View war details"
        aria-haspopup="dialog"
        aria-label={`Score ${sessionScoreDisplay}. Open war details.`}
        style={{
          pointerEvents: "auto",
          margin: 0,
          padding: "6px 8px",
          ...hudMiniPanel,
          fontSize: 10,
          lineHeight: 1.4,
          cursor: "pointer",
          textAlign: "left",
          width: "100%",
          boxSizing: "border-box",
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
          Score
        </div>
        <div
          style={{
            color: hudColors.value,
            fontWeight: 700,
            fontSize: 12,
            lineHeight: 1.2,
            fontVariantNumeric: "tabular-nums",
            whiteSpace: "nowrap",
          }}
        >
          {sessionScoreDisplay}
        </div>
      </button>

      <div
        style={{
          padding: "6px 8px",
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
        Shot
      </div>
      <div
        aria-label={
          holePar > 0
            ? `Shot ${sessionShots} of ${holePar} (strokes at or below par win the battle)`
            : `Shot ${sessionShots}`
        }
        style={{
          color: hudColors.value,
          fontWeight: 700,
          fontSize: 14,
          fontVariantNumeric: "tabular-nums",
          marginBottom: 10,
        }}
      >
        {holePar > 0 ? `${sessionShots}/${holePar}` : sessionShots}
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
        Wind
      </div>
      <div
        role="img"
        aria-label={`Wind ${windPercentOfMax.toFixed(0)}% of max from ${windFromAngleDeg.toFixed(0)}° in world XZ (X ${windHud.x.toFixed(2)}, Z ${windHud.z.toFixed(2)})`}
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
          {windPercentOfMax.toFixed(0)}%
        </span>
      </div>

      {shotInFlight && (
        <div style={{ ...metricsDivider, color: hudColors.value, fontSize: 10 }}>
          Shot in flight…
        </div>
      )}
      </div>

      {(charging && !shotInFlight && chargeHud) ||
      (inCooldown && !shotInFlight && !charging) ? (
        <div
          style={{
            padding: "6px 8px",
            ...hudMiniPanel,
            fontSize: 10,
            lineHeight: 1.4,
          }}
        >
          <div
            style={{
              color: hudColors.muted,
              marginBottom: 4,
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {charging && !shotInFlight && chargeHud ? "Charge" : "Cooldown"}
          </div>
          {charging && !shotInFlight && chargeHud ? (
            <>
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
            </>
          ) : (
            <div style={{ fontSize: 9, color: hudColors.label }}>
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
              s
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
