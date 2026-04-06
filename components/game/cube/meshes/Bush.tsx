"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

import { TURF_TOP_Y } from "@/lib/game/constants";

const CUBE = 0.38;

type LeafSpec = {
  pos: readonly [number, number, number];
  rot: readonly [number, number, number];
};

const LEAVES: readonly LeafSpec[] = [
  { pos: [0, 0, 0], rot: [0, 0.28, 0] },
  { pos: [0.22, 0.06, 0.12], rot: [0.1, -0.22, 0.06] },
  { pos: [-0.2, 0.05, -0.1], rot: [-0.08, 0.32, -0.05] },
  { pos: [0.1, -0.08, 0.18], rot: [0.12, 0.15, -0.1] },
];

const LEAF_COLORS = [
  "#2f6b3c",
  "#3a7d47",
  "#347040",
  "#2d6338",
] as const;

/**
 * Small ground bush — same leaf-cube style as `TeeCornerTree` leaves, no trunk.
 * Visual-only: raycast disabled so it never blocks clicks or physics.
 */
export function Bush({
  worldX,
  worldZ,
  seed,
}: {
  worldX: number;
  worldZ: number;
  /** Per-instance variation for rotation. */
  seed: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    const g = groupRef.current;
    if (!g) return;
    g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).raycast = () => {};
    });
  }, []);

  const y0 = TURF_TOP_Y;
  const yaw = (seed % 997) * 0.001 * Math.PI * 2;

  return (
    <group ref={groupRef} position={[worldX, y0, worldZ]} rotation={[0, yaw, 0]}>
      <group position={[0, CUBE / 2, 0]}>
        {LEAVES.map((leaf, i) => (
          <mesh
            key={`bush-leaf-${i}`}
            castShadow
            receiveShadow
            position={[...leaf.pos]}
            rotation={[...leaf.rot]}
          >
            <boxGeometry args={[CUBE, CUBE, CUBE]} />
            <meshStandardMaterial
              color={LEAF_COLORS[i % LEAF_COLORS.length]}
              roughness={0.78}
              metalness={0.04}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
