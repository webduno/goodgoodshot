"use client";

import * as THREE from "three";

import {
  BLOCK_SIZE,
  FIELD_GROUND_MUTED_GREEN,
  FIELD_PLANE_HALF_WIDTH_X,
  FIELD_PLANE_Z_BEFORE_SPAWN,
  FIELD_PLANE_Z_PAST_GOAL,
  GOAL_Z_MAX,
} from "@/lib/game/constants";

/**
 * Fixed XZ ground for the starting layout: a bit past yellow lane width and past max spawn→goal Z.
 */
export function InitialFieldGround() {
  const width = 2 * (2 * FIELD_PLANE_HALF_WIDTH_X);
  const z0 = -FIELD_PLANE_Z_BEFORE_SPAWN;
  const z1 = GOAL_Z_MAX + FIELD_PLANE_Z_PAST_GOAL;
  const depth = 2 * (z1 - z0);
  const zCenter = (z0 + z1) / 2;
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -BLOCK_SIZE / 2, zCenter]}
      receiveShadow
    >
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial
        color={FIELD_GROUND_MUTED_GREEN}
        side={THREE.DoubleSide}
        roughness={0.92}
        metalness={0}
      />
    </mesh>
  );
}
