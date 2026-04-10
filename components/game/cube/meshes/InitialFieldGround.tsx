"use client";

import { islandColorsForBiome } from "@/lib/game/biomes";
import {
  FIELD_ISLAND_FOUNDATION_SNOW_MESH,
  FIELD_SEA_ISLAND_TOP_COLOR,
  TURF_TOP_Y,
} from "@/lib/game/constants";
import type { IslandRect } from "@/lib/game/islands";
import type { BiomeId } from "@/lib/game/types";
import {
  PLAZA_HUB_FOUNDATION_FRUSTUM,
  PLAZA_HUB_RING_SLAB,
} from "@/lib/game/plazaHub";

import { PlazaHubEdgeDecor } from "@/components/game/cube/meshes/PlazaHubEdgeDecor";
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
  turfColorOverride,
}: {
  islands: readonly IslandRect[];
  biome: BiomeId;
  /** When set, replaces biome turf color (e.g. plaza hub grass vs plain course). */
  turfColorOverride?: string;
}) {
  const { turf: turfFromBiome, foundation: foundationColor } =
    islandColorsForBiome(biome);
  const turfColor = turfColorOverride ?? turfFromBiome;
  const seaGlassIslandTop = biome === "sea" && turfColorOverride == null;
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

        const wx = is.worldX;
        const wz = is.worldZ;
        const walkX = is.walkableHalfX;
        const walkZ = is.walkableHalfZ;
        const hubRing =
          walkX != null &&
          walkZ != null &&
          (walkX < is.halfX || walkZ < is.halfZ);

        if (hubRing) {
          const innerX = walkX * 2;
          const innerZ = walkZ * 2;
          const ringStoneRough = biome === "snow" ? 0.88 : 0.42;
          const ringStoneMetal = biome === "snow" ? 0.04 : 0.16;
          const hubRingColor = PLAZA_HUB_RING_SLAB;
          const hubFrustumColor = PLAZA_HUB_FOUNDATION_FRUSTUM;
          /** North / south strips: full outer width × ring depth. */
          const nsWide = is.halfX * 2;
          const nsDeep = is.halfZ - walkZ;
          const ewWide = is.halfX - walkX;
          const ewDeep = walkZ * 2;

          return (
            <group
              key={`island-${i}-${wx}-${wz}-${is.halfX}-${is.halfZ}-${th}-hub`}
            >
              <mesh position={[wx, cy, wz]} castShadow receiveShadow>
                <boxGeometry args={[innerX, th, innerZ]} />
                <meshStandardMaterial
                  color={seaGlassIslandTop ? FIELD_SEA_ISLAND_TOP_COLOR : turfColor}
                  roughness={seaGlassIslandTop ? 0.22 : 0.92}
                  metalness={seaGlassIslandTop ? 0.06 : 0}
                  transparent={seaGlassIslandTop}
                  opacity={seaGlassIslandTop ? 0.5 : 1}
                  depthWrite={!seaGlassIslandTop}
                />
              </mesh>
              <mesh
                position={[wx, cy, wz + walkZ + nsDeep / 2]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[nsWide, th, nsDeep]} />
                <meshStandardMaterial
                  color={hubRingColor}
                  roughness={ringStoneRough}
                  metalness={ringStoneMetal}
                />
              </mesh>
              <mesh
                position={[wx, cy, wz - walkZ - nsDeep / 2]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[nsWide, th, nsDeep]} />
                <meshStandardMaterial
                  color={hubRingColor}
                  roughness={ringStoneRough}
                  metalness={ringStoneMetal}
                />
              </mesh>
              <mesh
                position={[wx + walkX + ewWide / 2, cy, wz]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[ewWide, th, ewDeep]} />
                <meshStandardMaterial
                  color={hubRingColor}
                  roughness={ringStoneRough}
                  metalness={ringStoneMetal}
                />
              </mesh>
              <mesh
                position={[wx - walkX - ewWide / 2, cy, wz]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={[ewWide, th, ewDeep]} />
                <meshStandardMaterial
                  color={hubRingColor}
                  roughness={ringStoneRough}
                  metalness={ringStoneMetal}
                />
              </mesh>
              <mesh
                position={[wx, stoneCenterY, wz]}
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
                  color={hubFrustumColor}
                  roughness={biome === "snow" ? 0.88 : 0.48}
                  metalness={biome === "snow" ? 0.04 : 0.12}
                />
              </mesh>
              <PlazaHubEdgeDecor island={is} />
            </group>
          );
        }

        return (
          <group
            key={`island-${i}-${is.worldX}-${is.worldZ}-${is.halfX}-${is.halfZ}-${th}`}
          >
            <mesh position={[is.worldX, cy, is.worldZ]} castShadow receiveShadow>
              <boxGeometry args={[is.halfX * 2, th, is.halfZ * 2]} />
              <meshStandardMaterial
                color={seaGlassIslandTop ? FIELD_SEA_ISLAND_TOP_COLOR : turfColor}
                roughness={seaGlassIslandTop ? 0.22 : 0.92}
                metalness={seaGlassIslandTop ? 0.06 : 0}
                transparent={seaGlassIslandTop}
                opacity={seaGlassIslandTop ? 0.5 : 1}
                depthWrite={!seaGlassIslandTop}
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
                roughness={
                  biome === "snow" ? 0.88 : biome === "sea" ? 0.55 : 0.94
                }
                metalness={
                  biome === "snow" ? 0.04 : biome === "sea" ? 0.1 : 0.06
                }
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
