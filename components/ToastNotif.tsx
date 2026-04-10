"use client";

import {
  hudFont,
  hudToastZIndex,
  powerupToastAccentStyle,
} from "@/components/gameHudStyles";
import { useEffect, useState } from "react";

const DURATION_MS = 3000;

const defaultBubbleStyle = {
  color: "#003d5c",
  textShadow: "0 1px 0 rgba(255,255,255,0.45)",
  background:
    "linear-gradient(165deg, #ffffff 0%, #e8f8ff 45%, #c8e8f8 100%)",
  border: "1px solid rgba(255,255,255,0.88)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.55), 0 4px 14px rgba(0, 55, 95, 0.18)",
} as const;

type ToastNotifProps = {
  /** Increment each time to show the toast (restarts the 3s timer). */
  showToken: number;
  message: string;
  /** Distance from top of container (default matches primary HUD toasts). */
  top?: number;
  /** When set, bubble matches that power-up slot color (HUD accents). */
  accent?: "strength" | "noBounce" | "nowind" | "guideline";
};

export function ToastNotif({
  showToken,
  message,
  top = 16,
  accent,
}: ToastNotifProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (showToken === 0) return;
    setVisible(true);
    const id = window.setTimeout(() => setVisible(false), DURATION_MS);
    return () => window.clearTimeout(id);
  }, [showToken]);

  if (!visible) return null;

  const bubble =
    accent !== undefined
      ? powerupToastAccentStyle(accent)
      : defaultBubbleStyle;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "absolute",
        left: "50%",
        top,
        transform: "translateX(-50%)",
        zIndex: hudToastZIndex,
        pointerEvents: "none",
        ...hudFont,
        fontSize: 14,
        fontWeight: 600,
        padding: "8px 14px",
        borderRadius: 12,
        ...bubble,
      }}
    >
      {message}
    </div>
  );
}
