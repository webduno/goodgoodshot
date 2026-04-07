"use client";

import { islandColorsForBiome } from "@/lib/game/biomes";
import { FIELD_ISLAND_FOUNDATION_SNOW_MESH, TURF_TOP_Y } from "@/lib/game/constants";
import type { IslandRect } from "@/lib/game/islands";
import type { BiomeId } from "@/lib/game/types";
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
  biome,
}: {
  islands: readonly IslandRect[];
  biome: BiomeId;
}) {
  const { turf: turfColor, foundation: foundationColor } =
    islandColorsForBiome(biome);
  const foundationMeshColor =
    biome === "snow" ? FIELD_ISLAND_FOUNDATION_SNOW_MESH : foundationColor;

  return (
    <group>
      {islands.map((is, i) => {
        const th = is.blockThickness;
        const cy = TURF_TOP_Y - th / 2;
        const slabBottomY = TURF_TOP_Y - th;
        const stoneDepth =
          9 + (i % 3) * 1.2 + Math.min(6, (is.halfX + is.halfZ) * 0.28);
        const stoneTopY = slabBottomY + GRASS_STONE_OVERLAP_Y;
        const stoneCenterY = stoneTopY - stoneDepth / 2;
        /**
         * 4-sided frustum like goal `Block` pyramid (inverted): `radiusTop` is vertex distance on
         * local ±X/±Z. After Y rotation π/4, the world AABB shrinks by √2 vs unrotated — scale so the
         * top lines up with the slab; `0.94` nudges it slightly under the grass edge.
         */
        const foundationTopRadius =
          Math.max(is.halfX, is.halfZ) * 1.02 * Math.SQRT2 * 0.94;
        const foundationBottomRadius = Math.max(
          0.14,
          foundationTopRadius * 0.1
        );

        return (
          <group
            key={`island-${i}-${is.worldX}-${is.worldZ}-${is.halfX}-${is.halfZ}-${th}`}
          >
            <mesh position={[is.worldX, cy, is.worldZ]} castShadow receiveShadow>
              <boxGeometry args={[is.halfX * 2, th, is.halfZ * 2]} />
              <meshStandardMaterial
                color={turfColor}
                roughness={0.92}
                metalness={0}
              />
            </mesh>
            <mesh
              position={[is.worldX, stoneCenterY, is.worldZ]}
              rotation={[0, Math.PI / 4, 0]}
              castShadow
              receiveShadow
            >
              <cylinderGeometry
                args={[
                  foundationTopRadius,
                  foundationBottomRadius,
                  stoneDepth,
                  4,
                ]}
              />
              <meshStandardMaterial
                color={foundationMeshColor}
                roughness={biome === "snow" ? 0.88 : 0.94}
                metalness={biome === "snow" ? 0.04 : 0.06}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
