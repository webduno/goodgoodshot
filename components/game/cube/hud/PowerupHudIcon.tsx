"use client";

import type { PowerupSlotId } from "@/lib/game/types";

/** Inline SVG per slot (no external assets). */
export function PowerupHudIcon({
  slotId,
  color,
  size = 14,
}: {
  slotId: PowerupSlotId;
  color: string;
  size?: number;
}) {
  const s = size;
  const box = {
    width: s,
    height: s,
    viewBox: "0 0 24 24",
    "aria-hidden": true as const,
    style: { display: "block" as const, flexShrink: 0, color },
  };
  switch (slotId) {
    case "strength":
      return (
        <svg {...box}>
          <path
            fill="currentColor"
            d="M7 2v11h3v9l7-12h-4l4-8H7z"
          />
        </svg>
      );
    case "precision":
      return (
        <svg {...box} fill="none">
          <circle
            cx="12"
            cy="12"
            r="4"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            d="M12 5v2M12 17v2M5 12h2M17 12h2"
          />
        </svg>
      );
    case "time":
      return (
        <svg {...box}>
          <path
            fill="currentColor"
            d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"
          />
        </svg>
      );
    case "magnet":
      return (
        <svg {...box} fill="none">
          <path
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            d="M7 7v6a5 5 0 0 0 10 0V7"
          />
          <path
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            d="M9 7V5a1 1 0 0 1 1-1h0a1 1 0 0 1 1 1v2M13 7V5a1 1 0 0 1 1-1h0a1 1 0 0 1 1 1v2"
          />
        </svg>
      );
    case "lucky":
      return (
        <svg {...box}>
          <path
            fill="currentColor"
            d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7L12 17l-6.3 4 2.3-7-6-4.6h7.6z"
          />
        </svg>
      );
    default:
      return null;
  }
}
