"use client";

import { TURF_TOP_Y } from "@/lib/game/constants";
import { PLAZA_WALKABLE_HALF } from "@/lib/game/plazaHub";

/** Road surface width (XZ). */
const ROAD_WIDTH = 5;
/** Thin slab so vehicles stay visually above the strip (no clipping). */
const ROAD_THICKNESS = 0.04;
/** Lift above turf top to avoid z-fighting. */
const ROAD_CLEARANCE = 0.012;
/** Lighter than pillar / portal greys so roads read as pavement. */
const ROAD_COLOR = "#c4ccd6";

/**
 * |x| / |z| of each road centerline — wider spacing between parallel strips (not a tight inner square).
 */
const ROAD_CENTER_OFFSET = 28;
/**
 * Full width/height of the walkable square so each leg runs flush to the green edge (“connects outside”).
 */
const ROAD_FULL_SPAN = PLAZA_WALKABLE_HALF * 2;

/**
 * Flat plaza roads: one stretched box per segment, barely above `TURF_TOP_Y`.
 * Straight frame: parallel pairs farther apart, segments span edge-to-edge on the 80×80 turf.
 */
export function PlazaHubRoads() {
  const y = TURF_TOP_Y + ROAD_CLEARANCE + ROAD_THICKNESS / 2;
  const span = ROAD_FULL_SPAN;
  const o = ROAD_CENTER_OFFSET;

  return (
    <group>
      <mesh position={[0, y, o]} castShadow receiveShadow>
        <boxGeometry args={[span, ROAD_THICKNESS, ROAD_WIDTH]} />
        <meshStandardMaterial
          color={ROAD_COLOR}
          roughness={0.9}
          metalness={0.04}
        />
      </mesh>
      <mesh position={[0, y, -o]} castShadow receiveShadow>
        <boxGeometry args={[span, ROAD_THICKNESS, ROAD_WIDTH]} />
        <meshStandardMaterial
          color={ROAD_COLOR}
          roughness={0.9}
          metalness={0.04}
        />
      </mesh>
      <mesh position={[-o, y, 0]} castShadow receiveShadow>
        <boxGeometry args={[ROAD_WIDTH, ROAD_THICKNESS, span]} />
        <meshStandardMaterial
          color={ROAD_COLOR}
          roughness={0.9}
          metalness={0.04}
        />
      </mesh>
      <mesh position={[o, y, 0]} castShadow receiveShadow>
        <boxGeometry args={[ROAD_WIDTH, ROAD_THICKNESS, span]} />
        <meshStandardMaterial
          color={ROAD_COLOR}
          roughness={0.9}
          metalness={0.04}
        />
      </mesh>
    </group>
  );
}
