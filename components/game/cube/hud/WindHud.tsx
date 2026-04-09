"use client";

import { hudColors, hudFont, hudMiniPanel } from "@/components/gameHudStyles";
import { WIND_ACCEL_MAX } from "@/lib/game/wind";

/** Shared with map toggle so the wind gauge and map button match. */
export const WIND_HUD_CIRCLE_PX = 56;

/**
 * 8-point compass in XZ: +Z north, −X east, −Z south (+X west).
 * Drift bearing = atan2(−x, z): clockwise from north using horizontal acceleration.
 */
const WIND_CARDINAL_8 = [
  "N",
  "NE",
  "E",
  "SE",
  "S",
  "SW",
  "W",
  "NW",
] as const;

export function WindHud({
  windHud,
}: {
  windHud: { x: number; y: number; z: number };
}) {
  const windMag = Math.hypot(windHud.x, windHud.z);
  const windPercentOfMax =
    WIND_ACCEL_MAX > 0 ? (windMag / WIND_ACCEL_MAX) * 100 : 0;
  const driftBearingDeg =
    windMag < 1e-6
      ? undefined
      : ((Math.atan2(-windHud.x, windHud.z) * 180) / Math.PI + 360) % 360;
  const driftLabel =
    driftBearingDeg === undefined
      ? "Calm"
      : WIND_CARDINAL_8[Math.floor((driftBearingDeg + 22.5) / 45) % 8];

  return (
    <div
      role="img"
      aria-label={`Wind ${windPercentOfMax.toFixed(0)}% of max, drift toward ${driftLabel} (${driftBearingDeg?.toFixed(0) ?? "—"}° from +Z north; −X east, −Z south)`}
      style={{
        ...hudMiniPanel,
        ...hudFont,
        width: WIND_HUD_CIRCLE_PX,
        height: WIND_HUD_CIRCLE_PX,
        borderRadius: "50%",
        padding: 4,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        pointerEvents: "none",
        userSelect: "none",
        overflow: "hidden",
      }}
    >
      <span
        style={{
          color: hudColors.muted,
          fontSize: 7,
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          lineHeight: 1,
        }}
      >
        Wind
      </span>
      <span
        aria-hidden
        style={{
          color: hudColors.value,
          flexShrink: 0,
          fontWeight: 700,
          fontSize: driftLabel.length > 2 ? 9 : 11,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {driftLabel}
      </span>
      <span
        style={{
          color: hudColors.value,
          fontVariantNumeric: "tabular-nums",
          fontWeight: 600,
          fontSize: 9,
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        {windPercentOfMax.toFixed(0)}%
      </span>
    </div>
  );
}
