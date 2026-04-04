"use client";

import {
  goldPillButtonStyle,
  hudColors,
  modalCard,
  modalBackdrop,
} from "@/components/gameHudStyles";

export function FinishGameModal({
  open,
  sessionShots,
}: {
  open: boolean;
  sessionShots: number;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="finish-title"
      style={modalBackdrop}
    >
      <div style={modalCard}>
        <h2
          id="finish-title"
          style={{
            margin: "0 0 6px",
            fontSize: 17,
            fontWeight: 700,
            color: hudColors.value,
          }}
        >
          Level complete
        </h2>
        <p
          style={{
            margin: "0 0 10px",
            fontSize: 13,
            color: hudColors.muted,
            lineHeight: 1.5,
          }}
        >
          You hit the goal. More levels coming later.
        </p>
        <p
          style={{
            margin: "0 0 16px",
            fontSize: 13,
            color: hudColors.label,
            lineHeight: 1.5,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          Shots this round:{" "}
          <strong style={{ color: hudColors.value }}>{sessionShots}</strong>
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={goldPillButtonStyle({ disabled: false, fullWidth: true })}
        >
          Next round
        </button>
      </div>
    </div>
  );
}
