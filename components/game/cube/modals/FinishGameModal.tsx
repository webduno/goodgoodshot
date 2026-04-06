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
  par,
  battleWon,
}: {
  open: boolean;
  sessionShots: number;
  par: number;
  battleWon: boolean;
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
          {battleWon ? "Battle won" : "Battle lost"}
        </h2>
        <p
          style={{
            margin: "0 0 10px",
            fontSize: 13,
            color: hudColors.muted,
            lineHeight: 1.5,
          }}
        >
          {battleWon
            ? "You reached the goal at or under par (strokes ≤ coins on this hole)."
            : "You reached the goal, but over par (more strokes than coins)."}
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
          Shots:{" "}
          <strong style={{ color: hudColors.value }}>{sessionShots}</strong>
          {" · "}
          Par (coins):{" "}
          <strong style={{ color: hudColors.value }}>{par}</strong>
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
