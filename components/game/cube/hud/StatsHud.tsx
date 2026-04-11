"use client";

import {
  launchStrengthFromClicks,
  rgbTupleToCss,
  type PlayerVehicleConfig,
} from "@/components/playerVehicleConfig";
import { useEffect, useState, type CSSProperties, type MutableRefObject } from "react";

import type { RendererStatsSnapshot } from "@/components/game/cube/RendererStatsCollector";

import {
  goldChipButtonStyle,
  hudColors,
  hudFont,
  hudMiniPanel,
} from "@/components/gameHudStyles";
import { isLocalhostHostname } from "@/lib/isLocalhost";

import { HudIdleClockIcon } from "@/components/game/cube/hud/HudIdleIcons";
import { usePlayerStats } from "@/components/PlayerStatsProvider";

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
  vehicle,
  onScoreClick,
  rendererStatsRef,
  onOpenMyVehicles,
  onOpenProfile,
  profileButtonDisabled,
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
  vehicle: PlayerVehicleConfig;
  onScoreClick: () => void;
  /** Filled each frame inside `<Canvas>` from `WebGLRenderer.info` (draw calls / triangles). */
  rendererStatsRef: MutableRefObject<RendererStatsSnapshot | null>;
  /** When set, Vehicle panel shows a "change" control that opens the my-vehicles picker (e.g. plaza). */
  onOpenMyVehicles?: () => void;
  /** When set, a Profile chip is shown above the Vehicle panel. */
  onOpenProfile?: () => void;
  profileButtonDisabled?: boolean;
}) {
  const { stats } = usePlayerStats();
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [drawCalls, setDrawCalls] = useState<number | null>(null);
  const [isLocalhost, setIsLocalhost] = useState(false);

  useEffect(() => {
    setIsLocalhost(isLocalhostHostname(window.location.hostname));
  }, []);

  useEffect(() => {
    if (!isLocalhost) return;
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      if (t - last >= 100) {
        last = t;
        const s = rendererStatsRef.current;
        setDrawCalls(s ? s.calls : null);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [rendererStatsRef, isLocalhost]);

  const remainingMs =
    cooldownUntil !== null ? Math.max(0, cooldownUntil - Date.now()) : 0;
  const inCooldown = cooldownUntil !== null && remainingMs > 0;
  const charging = chargeHud !== null;
  const powerupMult = Math.pow(2, powerupStackCount);

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
      {onOpenProfile ? (
        <div
          style={{
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            aria-label="Open profile"
            onClick={onOpenProfile}
            disabled={profileButtonDisabled}
            style={goldChipButtonStyle()}
          >
            Profile
          </button>
          <span
            aria-label={`${stats.totalGoldCoins} gold coins`}
            title="Gold coins"
            style={{
              ...hudFont,
              fontSize: 11,
              fontWeight: 800,
              fontVariantNumeric: "tabular-nums",
              color: hudColors.accent,
              textShadow: "0 1px 2px rgba(0,0,0,0.25)",
              whiteSpace: "nowrap",
            }}
          >
            🪙 {stats.totalGoldCoins}
          </span>
        </div>
      ) : null}
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
              title="Launch strength on the first tap in the charge window; hold Shoot, Space, or the rear button to ramp clicks"
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
              style={{
                marginTop: 8,
                paddingTop: 8,
                borderTop: "1px solid rgba(255,255,255,0.28)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div
                role="status"
                aria-label={`Charge window ${vehicle.secondsBeforeShotTrigger} seconds`}
                style={{
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
              {onOpenMyVehicles ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenMyVehicles();
                  }}
                  aria-haspopup="dialog"
                  style={{
                    flexShrink: 0,
                    margin: 0,
                    padding: 0,
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: "rgba(255,255,255,0.95)",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    textDecoration: "underline",
                    textUnderlineOffset: 2,
                    textShadow: "0 1px 2px rgba(0,0,0,0.35)",
                  }}
                >
                  change
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onScoreClick}
        title="View war details"
        aria-haspopup="dialog"
        aria-label={
          holePar > 0
            ? `Shot ${sessionShots} of ${holePar} (strokes at or below par win the battle). Open war details.`
            : `Shot ${sessionShots}. Open war details.`
        }
        style={{
          pointerEvents: "auto",
          margin: 0,
          padding: "6px 8px",
          ...hudMiniPanel,
          fontSize: 10,
          lineHeight: 1.4,
          cursor: "pointer",
          textAlign: "left",
          width: "fit-content",
          maxWidth: "100%",
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
          Shot
        </div>
        <div
          style={{
            color: hudColors.value,
            fontWeight: 700,
            fontSize: 14,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {holePar > 0 ? `${sessionShots}/${holePar}` : sessionShots}
        </div>

        {shotInFlight && (
          <div style={{ ...metricsDivider, color: hudColors.value, fontSize: 10 }}>
            Shot in flight…
          </div>
        )}
      </button>

      {isLocalhost && (
        <div
          role="status"
          aria-label={
            drawCalls !== null
              ? `WebGL draw calls last frame: ${drawCalls}`
              : "WebGL draw calls loading"
          }
          title="Draw calls from THREE.WebGLRenderer.info.render.calls (≈ prior frame)"
          style={{
            padding: "6px 8px",
            ...hudMiniPanel,
            fontSize: 10,
            lineHeight: 1.4,
            width: "fit-content",
            maxWidth: "100%",
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
            Draw calls
          </div>
          <div
            style={{
              color: hudColors.value,
              fontWeight: 700,
              fontSize: 14,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {drawCalls !== null ? drawCalls : "—"}
          </div>
        </div>
      )}

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
