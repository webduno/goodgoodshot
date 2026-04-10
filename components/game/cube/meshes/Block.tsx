"use client";

import {
  BLOCK_SIZE,
  GOAL_PYRAMID_COLOR,
  GOAL_PYRAMID_Y_OFFSET,
} from "@/lib/game/constants";
import type { Vec3 } from "@/lib/game/types";

/** Bottom radius so the 4-sided pyramid base matches a 2×2 block footprint in XZ. */
const PYRAMID_BASE_RADIUS = (2 * BLOCK_SIZE) / Math.sqrt(2);
const PYRAMID_HEIGHT = 2 * BLOCK_SIZE;

export function Block({ center }: { center: Vec3 }) {
  /** Cylinder is centered on Y; sit the base on the turf plane (not block center y = 0). */
  const y = center[1] + GOAL_PYRAMID_Y_OFFSET;
  return (
    <group position={[center[0], y, center[2]]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0, PYRAMID_BASE_RADIUS, PYRAMID_HEIGHT, 4]} />
        <meshStandardMaterial
          color={GOAL_PYRAMID_COLOR}
          roughness={0.72}
          metalness={0.04}
        />
      </mesh>
    </group>
  );
}
