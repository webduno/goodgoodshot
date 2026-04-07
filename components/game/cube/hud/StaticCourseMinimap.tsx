"use client";

import { useMemo } from "react";

import { hudFont, hudMiniPanel } from "@/components/gameHudStyles";
import { islandColorsForBiome, minimapTeeSurfaceColor } from "@/lib/game/biomes";
import {
  FIELD_MINIMAP_DESERT_FOUNDATION,
  GOAL_PYRAMID_COLOR,
} from "@/lib/game/constants";
import type { BiomeId, IslandRect } from "@/lib/game/types";

const VIEW = 100;

/** Minimap pyramid icon (viewBox units) — large enough to read at ~116px inner width. */
const PYRAMID_MINIMAP_APEX_Y = 7;
const PYRAMID_MINIMAP_BASE_Y = 6;
const PYRAMID_MINIMAP_HALF_W = 6;

/**
 * Top-down schematic of the current hole’s island footprints (`IslandRect`), matching
 * `computeIslandsForLane` layout. Static (no player marker); updates only when the course rerolls.
 */
export function StaticCourseMinimap({
  islands,
  biome,
  goalWorldX,
  goalWorldZ,
}: {
  islands: readonly IslandRect[];
  biome: BiomeId;
  /** Lane XZ of the goal pyramid (same as `goalCenter[0]` / `[2]`). */
  goalWorldX: number;
  goalWorldZ: number;
}) {
  const { turf, foundation } = islandColorsForBiome(biome);
  const teeTop = minimapTeeSurfaceColor(biome);
  const foundationStrip =
    biome === "desert" ? FIELD_MINIMAP_DESERT_FOUNDATION : foundation;

  const { rects, viewBox, pyramid } = useMemo(() => {
    if (islands.length === 0) {
      return {
        rects: [] as const,
        viewBox: `0 0 ${VIEW} ${VIEW}`,
        pyramid: null as { cx: number; cy: number } | null,
      };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const is of islands) {
      minX = Math.min(minX, is.worldX - is.halfX);
      maxX = Math.max(maxX, is.worldX + is.halfX);
      minZ = Math.min(minZ, is.worldZ - is.halfZ);
      maxZ = Math.max(maxZ, is.worldZ + is.halfZ);
    }

    const span = Math.max(maxX - minX, maxZ - minZ);
    const pad = span * 0.08 + 2;
    const bx0 = minX - pad;
    const bx1 = maxX + pad;
    const bz0 = minZ - pad;
    const bz1 = maxZ + pad;
    const bw = bx1 - bx0;
    const bh = bz1 - bz0;

    /** Painter’s order: farther along the lane (+Z toward goal) first, nearer last so overlaps read correctly. */
    const ordered = islands
      .map((is, i) => ({ is, i }))
      .sort((a, b) => {
        const dz = b.is.worldZ - a.is.worldZ;
        if (Math.abs(dz) > 1e-6) return dz;
        return b.is.worldX - a.is.worldX;
      });

    const rects = ordered.map(({ is, i }) => {
      const x0 = is.worldX - is.halfX;
      const x1 = is.worldX + is.halfX;
      const z0 = is.worldZ - is.halfZ;
      const z1 = is.worldZ + is.halfZ;
      /** Mirror world X so “camera left” matches minimap left (same parity as the play view). */
      const sx = ((bx1 - x1) / bw) * VIEW;
      const sw = ((x1 - x0) / bw) * VIEW;
      const sy = ((bz1 - z1) / bh) * VIEW;
      const sh = ((z1 - z0) / bh) * VIEW;
      return { i, sx, sy, sw, sh };
    });

    /** Same mapping as island edges: goal pyramid center on XZ. */
    const cx = ((bx1 - goalWorldX) / bw) * VIEW;
    const cy = ((bz1 - goalWorldZ) / bh) * VIEW;

    return {
      rects,
      viewBox: `0 0 ${VIEW} ${VIEW}`,
      pyramid: { cx, cy },
    };
  }, [islands, goalWorldX, goalWorldZ]);

  if (islands.length === 0) return null;

  return (
    <div
      aria-hidden
      style={{
        ...hudMiniPanel,
        ...hudFont,
        width: 128,
        height: 128,
        padding: 6,
        boxSizing: "border-box",
        pointerEvents: "none",
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block" }}
      >
        <rect x="0" y="0" width={VIEW} height={VIEW} fill="#0a1628" />
        <defs>
          <linearGradient id="minimapFairway" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={turf} />
            <stop offset="58%" stopColor={turf} />
            <stop offset="58%" stopColor={foundationStrip} />
            <stop offset="100%" stopColor={foundationStrip} />
          </linearGradient>
          <linearGradient id="minimapTee" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={teeTop} />
            <stop offset="58%" stopColor={teeTop} />
            <stop offset="58%" stopColor={foundationStrip} />
            <stop offset="100%" stopColor={foundationStrip} />
          </linearGradient>
        </defs>
        {rects.map((p) => (
          <rect
            key={`${p.i}-${p.sx}-${p.sy}`}
            x={p.sx}
            y={p.sy}
            width={p.sw}
            height={p.sh}
            rx={Math.min(2, p.sw * 0.06, p.sh * 0.06)}
            fill={p.i === 0 ? "url(#minimapTee)" : "url(#minimapFairway)"}
            stroke="rgba(255,255,255,0.22)"
            strokeWidth={0.4}
          />
        ))}
        {pyramid && (
          <polygon
            points={`${pyramid.cx},${pyramid.cy - PYRAMID_MINIMAP_APEX_Y} ${pyramid.cx - PYRAMID_MINIMAP_HALF_W},${pyramid.cy + PYRAMID_MINIMAP_BASE_Y} ${pyramid.cx + PYRAMID_MINIMAP_HALF_W},${pyramid.cy + PYRAMID_MINIMAP_BASE_Y}`}
            fill={GOAL_PYRAMID_COLOR}
            stroke="#f0f4f8"
            strokeWidth={2.25}
            strokeLinejoin="round"
            paintOrder="stroke fill"
          />
        )}
      </svg>
    </div>
  );
}
