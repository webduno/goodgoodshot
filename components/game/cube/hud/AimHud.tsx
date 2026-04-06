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
  onPitchMaxUp,
  onPitchUp,
  onPitchDown,
  onPitchMaxDown,
  onMinus90,
  onLeft,
  onRight,
  onPlus90,
}: {
  disabled: boolean;
  onPitchMaxUp: () => void;
  onPitchUp: () => void;
  onPitchDown: () => void;
  onPitchMaxDown: () => void;
  onMinus90: () => void;
  onLeft: () => void;
  onRight: () => void;
  onPlus90: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        alignSelf: "center",
      }}
    >
      <div
        style={{
          ...hudAimPanelStrip,
          ...hudFont,
        }}
      >
        <button
          type="button"
          aria-label="Aim pitch to maximum up"
          title="Aim pitch to maximum up"
          disabled={disabled}
          onClick={onPitchMaxUp}
          style={aimQuarterButtonStyle(disabled)}
        >
          ⇈
        </button>
        <button
          type="button"
          aria-label="Aim pitch up"
          title="Aim pitch up"
          disabled={disabled}
          onClick={onPitchUp}
          style={goldIconButtonStyle(disabled)}
        >
          ↑
        </button>
        <button
          type="button"
          aria-label="Aim pitch down"
          title="Aim pitch down"
          disabled={disabled}
          onClick={onPitchDown}
          style={goldIconButtonStyle(disabled)}
        >
          ↓
        </button>
        <button
          type="button"
          aria-label="Aim pitch to maximum down"
          title="Aim pitch to maximum down"
          disabled={disabled}
          onClick={onPitchMaxDown}
          style={aimQuarterButtonStyle(disabled)}
        >
          ⇊
        </button>
      </div>
      <div
        style={{
          ...hudAimPanelStrip,
          ...hudFont,
        }}
      >
        <button
          type="button"
          aria-label="Aim plus 90 degrees"
          title="Aim plus 90 degrees"
          disabled={disabled}
          onClick={onPlus90}
          style={aimQuarterButtonStyle(disabled)}
        >
          ⇐
        </button>
        <button
          type="button"
          aria-label="Aim left"
          title="Aim left"
          disabled={disabled}
          onClick={onLeft}
          style={goldIconButtonStyle(disabled)}
        >
          ←
        </button>
        <button
          type="button"
          aria-label="Aim right"
          title="Aim right"
          disabled={disabled}
          onClick={onRight}
          style={goldIconButtonStyle(disabled)}
        >
          →
        </button>
        <button
          type="button"
          aria-label="Aim minus 90 degrees"
          title="Aim minus 90 degrees"
          disabled={disabled}
          onClick={onMinus90}
          style={aimQuarterButtonStyle(disabled)}
        >
          ⇒
        </button>
      </div>
    </div>
  );
}
