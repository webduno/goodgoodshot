"use client";

import { hudColors, hudFont } from "@/components/gameHudStyles";
import type { SessionBiomeChoice } from "@/lib/game/sessionBattleMaps";

export type BiomeBadgeOption = {
  id: SessionBiomeChoice;
  emoji: string;
  label: string;
  /** Longer copy for the new-session wizard (random only). */
  newSessionLabel?: string;
};

export const SESSION_BIOME_BADGE_OPTIONS: readonly BiomeBadgeOption[] = [
  { id: "random", emoji: "🎲", label: "Random", newSessionLabel: "Random (each battle)" },
  { id: "plain", emoji: "⛳", label: "Plain" },
  { id: "desert", emoji: "🏜️", label: "Desert" },
  { id: "forest", emoji: "🌲", label: "Forest" },
  { id: "snow", emoji: "❄️", label: "Snow" },
  { id: "sea", emoji: "🌊", label: "Sea" },
  { id: "ice", emoji: "🧊", label: "Ice" },
];

function optionLabel(opt: BiomeBadgeOption, labelMode: "default" | "newSession"): string {
  if (labelMode === "newSession" && opt.newSessionLabel) return opt.newSessionLabel;
  return opt.label;
}

export function BiomeChoiceBadgeList({
  value,
  onChange,
  disabled,
  labelMode = "default",
}: {
  value: SessionBiomeChoice;
  onChange: (next: SessionBiomeChoice) => void;
  disabled?: boolean;
  labelMode?: "default" | "newSession";
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 6,
        alignItems: "center",
      }}
    >
      {SESSION_BIOME_BADGE_OPTIONS.map((opt) => {
        const selected = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 9999,
              border: selected
                ? "2px solid #0072bc"
                : "1px solid rgba(0, 114, 188, 0.18)",
              background: selected
                ? "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(210, 240, 255, 0.55) 100%)"
                : "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(230, 248, 255, 0.35) 100%)",
              cursor: disabled ? "not-allowed" : "pointer",
              textAlign: "center",
              maxWidth: "100%",
              ...hudFont,
            }}
          >
            <span
              style={{
                fontSize: 13,
                lineHeight: 1,
                flexShrink: 0,
              }}
              aria-hidden
            >
              {opt.emoji}
            </span>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: hudColors.value,
                lineHeight: 1.25,
              }}
            >
              {optionLabel(opt, labelMode)}
            </span>
            {selected ? (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: hudColors.accent,
                  flexShrink: 0,
                }}
                aria-hidden
              >
                ✓
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
