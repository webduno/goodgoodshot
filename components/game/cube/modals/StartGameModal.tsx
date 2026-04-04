"use client";

import {
  goldPillButtonStyle,
  hudColors,
  modalCard,
  modalBackdrop,
} from "@/components/gameHudStyles";

export function StartGameModal({
  open,
  onStart,
}: {
  open: boolean;
  onStart: () => void;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="start-game-title"
      style={modalBackdrop}
    >
      <div style={modalCard}>
        <h2
          id="start-game-title"
          style={{
            margin: "0 0 10px",
            fontSize: 17,
            fontWeight: 700,
            color: hudColors.value,
          }}
        >
          Welcome
        </h2>
        <p
          style={{
            margin: "0 0 16px",
            fontSize: 13,
            color: hudColors.muted,
            lineHeight: 1.5,
          }}
        >
          Shoot and hit the red goal.
        </p>
        <button
          type="button"
          onClick={onStart}
          style={goldPillButtonStyle({ disabled: false, fullWidth: true })}
        >
          Start game
        </button>
      </div>
    </div>
  );
}
