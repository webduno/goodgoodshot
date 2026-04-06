"use client";

import {
  goldPillButtonStyle,
  hudColors,
  modalCard,
  modalBackdrop,
} from "@/components/gameHudStyles";
import { clearPlaySession } from "@/lib/game/playSession";

export function SessionEndModal({
  open,
  totalStrokes,
  targetBattles,
}: {
  open: boolean;
  totalStrokes: number;
  targetBattles: number;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-end-title"
      style={modalBackdrop}
    >
      <div style={modalCard}>
        <h2
          id="session-end-title"
          style={{
            margin: "0 0 6px",
            fontSize: 17,
            fontWeight: 700,
            color: hudColors.value,
          }}
        >
          Session ended
        </h2>
        <p
          style={{
            margin: "0 0 16px",
            fontSize: 13,
            color: hudColors.muted,
            lineHeight: 1.5,
          }}
        >
          All {targetBattles} battles won.
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
          Total strokes this session:{" "}
          <strong style={{ color: hudColors.value }}>{totalStrokes}</strong>
        </p>
        <button
          type="button"
          onClick={() => {
            clearPlaySession();
            window.location.reload();
          }}
          style={goldPillButtonStyle({ disabled: false, fullWidth: true })}
        >
          Done
        </button>
      </div>
    </div>
  );
}
