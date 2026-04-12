"use client";

import type { CSSProperties } from "react";

import { PowerupHudIcon } from "@/components/game/cube/hud/PowerupHudIcon";
import { hudColors, POWERUP_SLOT_ACCENT } from "@/components/gameHudStyles";

export function nextShotPowerupPillStyle(
  slot: "strength" | "noBounce" | "nowind"
): CSSProperties {
  const a = POWERUP_SLOT_ACCENT[slot];
  const text =
    slot === "strength"
      ? "#7c2d12"
      : slot === "noBounce"
        ? "#4c1d95"
        : "#0c4a5e";
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    padding: "0 6px",
    height: 18,
    borderRadius: 999,
    fontSize: 9,
    fontWeight: 700,
    color: text,
    textShadow: "0 1px 0 rgba(255,255,255,0.45)",
    background: a.ready,
    border: "1px solid rgba(255,255,255,0.88)",
    boxShadow: a.shadow,
    whiteSpace: "nowrap",
  };
}

/**
 * Pills for power-ups armed for the next shot (Strength stack, No bounce, No wind).
 * Used above the vehicle (world-space Html) and in the screen HUD.
 */
export function NextShotPowerupsStrip({
  powerupStackCount,
  noBounceActive,
  noWindActive,
  variant = "world",
}: {
  powerupStackCount: number;
  noBounceActive: boolean;
  noWindActive: boolean;
  variant?: "world" | "hud";
}) {
  const hasAny =
    powerupStackCount > 0 || noBounceActive || noWindActive;
  if (!hasAny) return null;

  const strengthMult = Math.pow(2, powerupStackCount);

  const titleStyle: CSSProperties =
    variant === "hud"
      ? {
          fontSize: 9,
          fontWeight: 600,
          color: hudColors.label,
          letterSpacing: "0.04em",
          textTransform: "uppercase" as const,
          textShadow: "0 1px 0 rgba(255,255,255,0.85)",
        }
      : {
          fontSize: 9,
          fontWeight: 600,
          color: "rgba(15, 23, 42, 0.72)",
          letterSpacing: "0.02em",
        };

  const rowStyle: CSSProperties =
    variant === "hud"
      ? {
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          justifyContent: "flex-start",
        }
      : {
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          justifyContent: "center",
        };

  return (
    <div
      style={
        variant === "hud"
          ? {
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 4,
            }
          : {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              maxWidth: 190,
            }
      }
    >
      <span style={titleStyle}>Power-ups in use</span>
      <div style={rowStyle} role="status" aria-label="Power-ups for next shot">
        {powerupStackCount > 0 && (
          <span style={nextShotPowerupPillStyle("strength")}>
            <PowerupHudIcon slotId="strength" color="currentColor" size={11} />
            ×{strengthMult}
          </span>
        )}
        {noBounceActive && (
          <span style={nextShotPowerupPillStyle("noBounce")}>
            <PowerupHudIcon slotId="noBounce" color="currentColor" size={11} />
            No bounce
          </span>
        )}
        {noWindActive && (
          <span style={nextShotPowerupPillStyle("nowind")}>
            <PowerupHudIcon slotId="nowind" color="currentColor" size={11} />
            No wind
          </span>
        )}
      </div>
    </div>
  );
}
