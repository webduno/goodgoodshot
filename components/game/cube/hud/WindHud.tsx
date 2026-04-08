"use client";

import { hudColors, hudFont, hudMiniPanel } from "@/components/gameHudStyles";
import { WIND_ACCEL_MAX } from "@/lib/game/wind";

/** Shared with map toggle so the wind gauge and map button match. */
export const WIND_HUD_CIRCLE_PX = 56;

/** 8-point compass: North matches +Z (sun / farthest goal). */
const WIND_FROM_CARDINAL_8 = [
  "N",
  "NE",
  "E",
  "SE",
  "S",
  "SW",
  "W",
  "NW",
] as const;

export function WindHud({ windHud }: { windHud: { x: number; z: number } }) {
  const windMag = Math.hypot(windHud.x, windHud.z);
  const windPercentOfMax =
    WIND_ACCEL_MAX > 0 ? (windMag / WIND_ACCEL_MAX) * 100 : 0;
  /** Meteorological convention: direction the wind comes from (opposite to acceleration). */
  const fromX = -windHud.x;
  const fromZ = -windHud.z;
  /** Bearing from +Z (north) clockwise in the XZ plane; undefined when calm. */
  const windFromBearingDeg =
    windMag < 1e-6
      ? undefined
      : ((Math.atan2(fromX, fromZ) * 180) / Math.PI + 360) % 360;
  const windFromLabel =
    windFromBearingDeg === undefined
      ? "Calm"
      : WIND_FROM_CARDINAL_8[
          Math.floor((windFromBearingDeg + 22.5) / 45) % 8
        ];

  return (
    <div
      role="img"
      aria-label={`Wind ${windPercentOfMax.toFixed(0)}% of max from the ${windFromLabel} (${windFromBearingDeg?.toFixed(0) ?? "—"}° bearing, +Z is north); world XZ X ${windHud.x.toFixed(2)}, Z ${windHud.z.toFixed(2)}`}
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
          fontSize: windFromLabel.length > 2 ? 9 : 11,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {windFromLabel}
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
