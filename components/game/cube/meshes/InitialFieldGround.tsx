"use client";

import {
  FIELD_GROUND_MUTED_GREEN,
  TURF_TOP_Y,
} from "@/lib/game/constants";
import type { IslandRect } from "@/lib/game/islands";

/** Muted stone under the turf slab — visual only (physics uses island rects). */
const ISLAND_FOUNDATION_GREY = "#6b6f76";
/** Island footprint scale (XZ) relative to the green slab — slightly inset. */
const FOUNDATION_FOOTPRINT = 0.9;
/**
 * Grey top extends slightly into the grass mesh so there is no visible air gap
 * (same center XZ as the island).
 */
const GRASS_STONE_OVERLAP_Y = 0.06;

/**
 * Blocky island meshes (void/sky between them). Top face at `TURF_TOP_Y` for ball physics.
 */
export function InitialFieldGround({
  islands,
}: {
  islands: readonly IslandRect[];
}) {
  return (
    <group>
      {islands.map((is, i) => {
        const th = is.blockThickness;
        const cy = TURF_TOP_Y - th / 2;
        const slabBottomY = TURF_TOP_Y - th;
        const ux = is.halfX * 2 * FOUNDATION_FOOTPRINT;
        const uz = is.halfZ * 2 * FOUNDATION_FOOTPRINT;
        const stoneDepth =
          9 + (i % 3) * 1.2 + Math.min(6, (is.halfX + is.halfZ) * 0.28);
        const stoneTopY = slabBottomY + GRASS_STONE_OVERLAP_Y;
        const stoneCenterY = stoneTopY - stoneDepth / 2;

        return (
          <group
            key={`island-${i}-${is.worldX}-${is.worldZ}-${is.halfX}-${is.halfZ}-${th}`}
          >
            <mesh position={[is.worldX, cy, is.worldZ]} castShadow receiveShadow>
              <boxGeometry args={[is.halfX * 2, th, is.halfZ * 2]} />
              <meshStandardMaterial
                color={FIELD_GROUND_MUTED_GREEN}
                roughness={0.92}
                metalness={0}
              />
            </mesh>
            <mesh
              position={[is.worldX, stoneCenterY, is.worldZ]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[ux, stoneDepth, uz]} />
              <meshStandardMaterial
                color={ISLAND_FOUNDATION_GREY}
                roughness={0.94}
                metalness={0.06}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
