"use client";

import { useEffect } from "react";

import {
  goldPillButtonStyle,
  helpModalCard,
  hudColors,
  hudFont,
  modalBackdrop,
} from "@/components/gameHudStyles";

export function GuidelineInfoModal({
  open,
  onClose,
  onOpenPowerupMenu,
}: {
  open: boolean;
  onClose: () => void;
  onOpenPowerupMenu: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guideline-info-title"
      style={modalBackdrop}
      onClick={onClose}
    >
      <div style={{ ...helpModalCard, ...hudFont }} onClick={(e) => e.stopPropagation()}>
        <h2
          id="guideline-info-title"
          style={{
            margin: "0 0 10px",
            fontSize: 16,
            fontWeight: 800,
            color: hudColors.value,
          }}
        >
          Guideline
        </h2>
        <p
          style={{
            margin: "0 0 12px",
            fontSize: 13,
            lineHeight: 1.5,
            color: hudColors.label,
          }}
        >
          One charge draws a dashed path along your aim at full strength (then
          your actual power while charging) to the first landing or goal. The
          preview ignores wind; strength stacks still apply.
        </p>
        <p
          style={{
            margin: "0 0 16px",
            fontSize: 12,
            lineHeight: 1.45,
            color: hudColors.muted,
          }}
        >
          Use or buy charges from the{" "}
          <strong style={{ color: hudColors.value }}>Power-ups</strong> button
          at the bottom of the screen.
        </p>
        <button
          type="button"
          style={goldPillButtonStyle({ disabled: false, fullWidth: true })}
          onClick={() => {
            onClose();
            onOpenPowerupMenu();
          }}
        >
          Open Power-ups
        </button>
      </div>
    </div>
  );
}
