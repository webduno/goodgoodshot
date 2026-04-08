"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

import {
  BLOCKY_TREE_LEAF_COLORS,
  BLOCKY_TREE_LEAF,
  BLOCKY_TREE_LEAVES,
  BLOCKY_TREE_TRUNK_COLOR,
  BLOCKY_TREE_TRUNK_D,
  BLOCKY_TREE_TRUNK_H,
  BLOCKY_TREE_TRUNK_W,
} from "./blockyTreeShared";

/**
 * Blocky tree (cubes only): trunk + six overlapping leaf cubes.
 * `groundY` is the world Y of the trunk base (tee pad top or `TURF_TOP_Y`).
 */
export function BlockyTree({
  groundY,
  seed = 0,
  raycastDisabled = false,
}: {
  groundY: number;
  seed?: number;
  /** When true, meshes ignore raycasts (decorative island trees). */
  raycastDisabled?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    if (!raycastDisabled) return;
    const g = groupRef.current;
    if (!g) return;
    g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).raycast = () => {};
    });
  }, [raycastDisabled]);

  const yaw = (seed % 10007) * 0.0001 * Math.PI * 2;

  return (
    <group ref={groupRef} rotation={[0, yaw, 0]}>
      <mesh castShadow receiveShadow position={[0, groundY + BLOCKY_TREE_TRUNK_H / 2, 0]}>
        <boxGeometry args={[BLOCKY_TREE_TRUNK_W, BLOCKY_TREE_TRUNK_H, BLOCKY_TREE_TRUNK_D]} />
        <meshStandardMaterial
          color={BLOCKY_TREE_TRUNK_COLOR}
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>
      <group position={[0, groundY + BLOCKY_TREE_TRUNK_H, 0]}>
        {BLOCKY_TREE_LEAVES.map((leaf, i) => (
          <mesh
            key={`leaf-${i}`}
            castShadow
            receiveShadow
            position={[...leaf.pos]}
            rotation={[...leaf.rot]}
          >
            <boxGeometry args={[BLOCKY_TREE_LEAF, BLOCKY_TREE_LEAF, BLOCKY_TREE_LEAF]} />
            <meshStandardMaterial
              color={BLOCKY_TREE_LEAF_COLORS[i]}
              roughness={0.78}
              metalness={0.04}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
