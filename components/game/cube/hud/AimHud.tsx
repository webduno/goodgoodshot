"use client";

import * as THREE from "three";

import {
  goldIconButtonStyle,
  hudAimPanelStrip,
  hudBottomReadoutLabel,
  hudBottomReadoutValue,
  hudFont,
} from "@/components/gameHudStyles";
import type { CSSProperties } from "react";

function aimQuarterButtonStyle(disabled: boolean): CSSProperties {
  return {
    ...goldIconButtonStyle(disabled),
    minWidth: 36,
    width: 36,
    paddingLeft: 0,
    paddingRight: 0,
    fontSize: 16,
    fontWeight: 900,
  };
}

export function AimHud({
  aimYawRad,
  disabled,
  onMinus90,
  onLeft,
  onRight,
  onPlus90,
}: {
  aimYawRad: number;
  disabled: boolean;
  onMinus90: () => void;
  onLeft: () => void;
  onRight: () => void;
  onPlus90: () => void;
}) {
  const deg = THREE.MathUtils.radToDeg(aimYawRad);
  return (
    <div
      style={{
        ...hudAimPanelStrip,
        ...hudFont,
      }}
    >
      <button
        type="button"
        aria-label="Aim plus 90 degrees"
        disabled={disabled}
        onClick={onPlus90}
        style={aimQuarterButtonStyle(disabled)}
      >
        ⇐
      </button>
      <button
        type="button"
        aria-label="Aim left"
        disabled={disabled}
        onClick={onLeft}
        style={goldIconButtonStyle(disabled)}
      >
        ←
      </button>
      <span
        style={{
          minWidth: 92,
          textAlign: "center",
          fontSize: 12,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "0.01em",
          ...hudBottomReadoutLabel,
        }}
      >
        Aim{" "}
        <span
          style={{
            ...hudBottomReadoutValue,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {deg >= 0 ? "+" : ""}
          {deg.toFixed(1)}°
        </span>
      </span>
      <button
        type="button"
        aria-label="Aim right"
        disabled={disabled}
        onClick={onRight}
        style={goldIconButtonStyle(disabled)}
      >
        →
      </button>
      <button
        type="button"
        aria-label="Aim minus 90 degrees"
        disabled={disabled}
        onClick={onMinus90}
        style={aimQuarterButtonStyle(disabled)}
      >
        ⇒
      </button>
    </div>
  );
}
