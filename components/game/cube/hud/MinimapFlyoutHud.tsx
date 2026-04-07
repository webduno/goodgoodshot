"use client";

import { useState } from "react";

import { hudFont, hudMiniPanel } from "@/components/gameHudStyles";
import type { BiomeId, IslandRect } from "@/lib/game/types";

import { StaticCourseMinimap } from "./StaticCourseMinimap";
import { WIND_HUD_CIRCLE_PX } from "./WindHud";

/**
 * Circular map control (same size as `WindHud`) that opens the course minimap in a panel to the left.
 */
export function MinimapFlyoutHud({
  islands,
  biome,
  goalWorldX,
  goalWorldZ,
}: {
  islands: readonly IslandRect[];
  biome: BiomeId;
  goalWorldX: number;
  goalWorldZ: number;
}) {
  const [open, setOpen] = useState(false);

  if (islands.length === 0) return null;

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "flex-end",
      }}
    >
      {open && (
        <div
          style={{
            position: "absolute",
            right: "100%",
            top: 0,
            marginRight: 8,
            zIndex: 1,
            filter: "drop-shadow(0 4px 14px rgba(0, 55, 95, 0.2))",
          }}
        >
          <StaticCourseMinimap
            islands={islands}
            biome={biome}
            goalWorldX={goalWorldX}
            goalWorldZ={goalWorldZ}
          />
        </div>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Close course map" : "Open course map"}
        onClick={() => setOpen((v) => !v)}
        style={{
          ...hudMiniPanel,
          ...hudFont,
          width: WIND_HUD_CIRCLE_PX,
          height: WIND_HUD_CIRCLE_PX,
          borderRadius: "50%",
          padding: 0,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: 26,
          lineHeight: 1,
          userSelect: "none",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        🗺️
      </button>
    </div>
  );
}
