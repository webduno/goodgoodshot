"use client";

import { hudColors, hudFont, hudMiniPanel } from "@/components/gameHudStyles";
import { WIND_ACCEL_MAX } from "@/lib/game/wind";

/** Shared with map toggle so the wind gauge and map button match. */
export const WIND_HUD_CIRCLE_PX = 56;

export function WindHud({ windHud }: { windHud: { x: number; z: number } }) {
  const windMag = Math.hypot(windHud.x, windHud.z);
  const windPercentOfMax =
    WIND_ACCEL_MAX > 0 ? (windMag / WIND_ACCEL_MAX) * 100 : 0;
  /** Meteorological convention: direction the wind comes from (opposite to acceleration). */
  const windFromAngleDeg =
    (Math.atan2(-windHud.z, -windHud.x) * 180) / Math.PI;
  /** Fixed length: direction-only; strength is shown as the % label. */
  const windArrowLen = 20;

  return (
    <div
      role="img"
      aria-label={`Wind ${windPercentOfMax.toFixed(0)}% of max from ${windFromAngleDeg.toFixed(0)}° in world XZ (X ${windHud.x.toFixed(2)}, Z ${windHud.z.toFixed(2)})`}
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
      <svg
        width={24}
        height={24}
        viewBox="0 0 40 40"
        aria-hidden
        style={{ color: hudColors.value, flexShrink: 0 }}
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
