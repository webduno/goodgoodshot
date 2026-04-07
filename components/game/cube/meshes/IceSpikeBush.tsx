"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

import { TURF_TOP_Y } from "@/lib/game/constants";

const ICE_COLORS = [
  "#5eb8e8",
  "#4aa8dc",
  "#6ec4f0",
  "#3d96cc",
] as const;

/**
 * Snow undergrowth: one thin, tall blue ice spike (tapered cone), visual-only (raycast off).
 */
export function IceSpikeBush({
  worldX,
  worldZ,
  seed,
}: {
  worldX: number;
  worldZ: number;
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
  const groupYaw = (seed % 997) * 0.001 * Math.PI * 2;
  const radius = 0.042 + (seed % 11) * 0.0025;
  const height = 0.88 + (seed >>> 3) % 15 * 0.03;
  const color = ICE_COLORS[seed % ICE_COLORS.length];

  return (
    <group ref={groupRef} position={[worldX, y0, worldZ]} rotation={[0, groupYaw, 0]}>
      <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
        <coneGeometry args={[radius, height, 6]} />
        <meshStandardMaterial
          color={color}
          roughness={0.35}
          metalness={0.18}
        />
      </mesh>
    </group>
  );
}
