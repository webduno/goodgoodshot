"use client";

import { hudFont, hudMiniPanel } from "@/components/gameHudStyles";
import type { IslandRect } from "@/lib/game/types";

import { WIND_HUD_CIRCLE_PX } from "./WindHud";

/**
 * Circular map control (same size as `WindHud`) — opens the course map modal in `CubeScene`.
 */
export function MinimapFlyoutHud({
  islands,
  mapModalOpen,
  onOpenMap,
}: {
  islands: readonly IslandRect[];
  mapModalOpen: boolean;
  onOpenMap: () => void;
}) {
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
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={mapModalOpen}
        aria-label="Open course map"
        onClick={onOpenMap}
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
