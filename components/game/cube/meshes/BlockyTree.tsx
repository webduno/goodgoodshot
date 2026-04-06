"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

const TRUNK_W = 0.52;
const TRUNK_H = 1.9;
const TRUNK_D = 0.52;

const LEAF = 0.72;

type LeafSpec = {
  pos: readonly [number, number, number];
  rot: readonly [number, number, number];
};

const LEAVES: readonly LeafSpec[] = [
  { pos: [0, 0, 0], rot: [0, 0.35, 0] },
  { pos: [0.32, 0.1, 0.18], rot: [0.12, -0.28, 0.08] },
  { pos: [-0.34, 0.07, -0.16], rot: [-0.1, 0.4, -0.06] },
  { pos: [0.16, -0.12, 0.32], rot: [0.15, 0.2, -0.12] },
  { pos: [-0.26, 0.16, 0.22], rot: [-0.08, -0.35, 0.1] },
  { pos: [0.1, 0.18, -0.35], rot: [0.1, 0.15, 0.22] },
];

const TRUNK_COLOR = "#5c3d2e";
const LEAF_COLORS = [
  "#2f6b3c",
  "#3a7d47",
  "#347040",
  "#2d6338",
  "#3d8a4a",
  "#326b3e",
] as const;

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
      <mesh castShadow receiveShadow position={[0, groundY + TRUNK_H / 2, 0]}>
        <boxGeometry args={[TRUNK_W, TRUNK_H, TRUNK_D]} />
        <meshStandardMaterial
          color={TRUNK_COLOR}
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>
      <group position={[0, groundY + TRUNK_H, 0]}>
        {LEAVES.map((leaf, i) => (
          <mesh
            key={`leaf-${i}`}
            castShadow
            receiveShadow
            position={[...leaf.pos]}
            rotation={[...leaf.rot]}
          >
            <boxGeometry args={[LEAF, LEAF, LEAF]} />
            <meshStandardMaterial
              color={LEAF_COLORS[i]}
              roughness={0.78}
              metalness={0.04}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
