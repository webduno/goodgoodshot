"use client";

import {
  goldIconButtonStyle,
  hudAimPanelStrip,
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
  disabled,
  onMinus90,
  onLeft,
  onRight,
  onPlus90,
}: {
  disabled: boolean;
  onMinus90: () => void;
  onLeft: () => void;
  onRight: () => void;
  onPlus90: () => void;
}) {
  return (
    <div
      style={{
        ...hudAimPanelStrip,
        ...hudFont,
        alignSelf: "center",
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
