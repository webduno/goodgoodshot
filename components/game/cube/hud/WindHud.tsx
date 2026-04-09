"use client";

import { hudColors, hudFont, hudMiniPanel } from "@/components/gameHudStyles";
import { WIND_ACCEL_MAX } from "@/lib/game/wind";

/** Shared with map toggle so the wind gauge and map button match. */
export const WIND_HUD_CIRCLE_PX = 56;

/** 8-point compass: North matches +Z (sun / farthest goal). Label = horizontal drift (acceleration), not meteorological “wind from”. */
const WIND_DRIFT_CARDINAL_8 = [
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
  /** Bearing of horizontal drift (+Z = toward goal) clockwise in the XZ plane; undefined when calm. */
  const windDriftBearingDeg =
    windMag < 1e-6
      ? undefined
      : ((Math.atan2(windHud.x, windHud.z) * 180) / Math.PI + 360) % 360;
  const windDriftLabel =
    windDriftBearingDeg === undefined
      ? "Calm"
      : WIND_DRIFT_CARDINAL_8[
          Math.floor((windDriftBearingDeg + 22.5) / 45) % 8
        ];

  return (
    <div
      role="img"
      aria-label={`Wind ${windPercentOfMax.toFixed(0)}% of max, drift toward ${windDriftLabel} (${windDriftBearingDeg?.toFixed(0) ?? "—"}° from +Z toward goal); world XZ X ${windHud.x.toFixed(2)}, Z ${windHud.z.toFixed(2)}`}
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
          fontSize: windDriftLabel.length > 2 ? 9 : 11,
          lineHeight: 1,
          letterSpacing: "-0.02em",
        }}
      >
        {windDriftLabel}
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
