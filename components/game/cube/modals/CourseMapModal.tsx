"use client";

import { useEffect, useMemo, useState } from "react";

import {
  goldIconButtonStyle,
  goldPillButtonStyle,
  helpModalCard,
  hudColors,
  hudFont,
  modalBackdrop,
} from "@/components/gameHudStyles";
import type { BiomeId, GameState, IslandRect } from "@/lib/game/types";

import { StaticCourseMinimap } from "@/components/game/cube/hud/StaticCourseMinimap";

export function CourseMapModal({
  open,
  onClose,
  islands,
  biome,
  goalWorldX,
  goalWorldZ,
  warMaps,
  initialBattleIndex = 0,
}: {
  open: boolean;
  onClose: () => void;
  islands: readonly IslandRect[];
  biome: BiomeId;
  goalWorldX: number;
  goalWorldZ: number;
  /** All battles in the current war (from session storage); when length > 1, arrows browse each map. */
  warMaps?: readonly GameState[] | null;
  /** Battle index to show when opening (0-based). */
  initialBattleIndex?: number;
}) {
  const multiWar = warMaps != null && warMaps.length > 1;
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    if (!warMaps || warMaps.length <= 1) return;
    const clamped = Math.max(
      0,
      Math.min(initialBattleIndex, warMaps.length - 1)
    );
    setSelectedIndex(clamped);
  }, [open, initialBattleIndex, warMaps]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (!warMaps || warMaps.length <= 1) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSelectedIndex(
          (i) => (i - 1 + warMaps.length) % warMaps.length
        );
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % warMaps.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, warMaps]);

  const display = useMemo(() => {
    if (multiWar && warMaps) {
      const g = warMaps[selectedIndex];
      if (!g) {
        return { islands, biome, goalWorldX, goalWorldZ };
      }
      return {
        islands: g.islands,
        biome: g.biome,
        goalWorldX: g.goalWorldX,
        goalWorldZ: g.goalWorldZ,
      };
    }
    return { islands, biome, goalWorldX, goalWorldZ };
  }, [
    multiWar,
    warMaps,
    selectedIndex,
    islands,
    biome,
    goalWorldX,
    goalWorldZ,
  ]);

  if (!open) return null;
  if (display.islands.length === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="battle-map-title"
      style={modalBackdrop}
      onClick={onClose}
    >
      <div
        style={{
          ...helpModalCard,
          ...hudFont,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          textAlign: "center",
          width: "min(94vw, 320px)",
          maxWidth: "min(94vw, 320px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="battle-map-title"
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 800,
            color: hudColors.value,
          }}
        >
          Battle map
        </h2>
        {multiWar ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              columnGap: 8,
              width: "100%",
            }}
          >
            <button
              type="button"
              aria-label="Previous battle map"
              style={{ ...goldIconButtonStyle(false), justifySelf: "end" }}
              onClick={(e) => {
                e.stopPropagation();
                if (!warMaps) return;
                const len = warMaps.length;
                setSelectedIndex((i) => (i - 1 + len) % len);
              }}
            >
              ‹
            </button>
            <StaticCourseMinimap
              islands={display.islands}
              biome={display.biome}
              goalWorldX={display.goalWorldX}
              goalWorldZ={display.goalWorldZ}
            />
            <button
              type="button"
              aria-label="Next battle map"
              style={{ ...goldIconButtonStyle(false), justifySelf: "start" }}
              onClick={(e) => {
                e.stopPropagation();
                if (!warMaps) return;
                const len = warMaps.length;
                setSelectedIndex((i) => (i + 1) % len);
              }}
            >
              ›
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              width: "100%",
            }}
          >
            <StaticCourseMinimap
              islands={display.islands}
              biome={display.biome}
              goalWorldX={display.goalWorldX}
              goalWorldZ={display.goalWorldZ}
            />
          </div>
        )}
        {multiWar && warMaps ? (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 600,
              color: hudColors.muted,
            }}
          >
            Battle {selectedIndex + 1} of {warMaps.length}
          </p>
        ) : null}
        <button
          type="button"
          style={goldPillButtonStyle({ disabled: false, fullWidth: true })}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
