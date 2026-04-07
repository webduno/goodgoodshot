"use client";

import { useEffect } from "react";

import {
  goldPillButtonStyle,
  helpModalCard,
  hudColors,
  hudFont,
  modalBackdrop,
} from "@/components/gameHudStyles";
import type { BiomeId, IslandRect } from "@/lib/game/types";

import { StaticCourseMinimap } from "@/components/game/cube/hud/StaticCourseMinimap";

export function CourseMapModal({
  open,
  onClose,
  islands,
  biome,
  goalWorldX,
  goalWorldZ,
}: {
  open: boolean;
  onClose: () => void;
  islands: readonly IslandRect[];
  biome: BiomeId;
  goalWorldX: number;
  goalWorldZ: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || islands.length === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="course-map-title"
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
          id="course-map-title"
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 800,
            color: hudColors.value,
          }}
        >
          Course map
        </h2>
        <StaticCourseMinimap
          islands={islands}
          biome={biome}
          goalWorldX={goalWorldX}
          goalWorldZ={goalWorldZ}
        />
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
