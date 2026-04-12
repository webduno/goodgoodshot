"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

import { TURF_TOP_Y } from "@/lib/game/constants";

const GREEN_COLORS = [
  "#3a7d48",
  "#448a52",
  "#3c7346",
] as const;

const SNOW_COLOR = "#eef6fb";

type GreenSpec = {
  pos: readonly [number, number, number];
  size: number;
};

/** Green cube cluster + thin snow slab on top (local Y up from turf). */
const GREEN_SPECS: readonly GreenSpec[] = [
  { pos: [0, 0.16, 0], size: 0.34 },
  { pos: [0.2, 0.13, 0.1], size: 0.26 },
  { pos: [-0.17, 0.12, -0.09], size: 0.24 },
];

/**
 * Snow-biome ground bush: green cubes with a flatter white “snow” box on top.
 * Visual-only (raycast off).
 */
export function SnowCubeBush({
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
  const yaw = (seed % 997) * 0.001 * Math.PI * 2;
  const sJ = 0.96 + ((seed >>> 2) % 7) * 0.012;

  let topY = 0;
  for (let i = 0; i < GREEN_SPECS.length; i++) {
    const g = GREEN_SPECS[i]!;
    const sz = g.size * sJ;
    const py = g.pos[1] * sJ;
    topY = Math.max(topY, py + sz / 2);
  }

  const snowH = 0.042;
  const snowW = 0.58 * sJ;
  const snowD = 0.52 * sJ;
  const snowY = topY + snowH / 2 + 0.008;

  return (
    <group ref={groupRef} position={[worldX, y0, worldZ]} rotation={[0, yaw, 0]}>
      {GREEN_SPECS.map((g, i) => {
        const sz = g.size * sJ;
        const px = g.pos[0] * sJ;
        const py = g.pos[1] * sJ;
        const pz = g.pos[2] * sJ;
        return (
          <mesh
            key={`snow-bush-green-${i}`}
            castShadow
            receiveShadow
            position={[px, py, pz]}
          >
            <boxGeometry args={[sz, sz, sz]} />
            <meshStandardMaterial
              color={GREEN_COLORS[i % GREEN_COLORS.length]}
              roughness={0.8}
              metalness={0.04}
            />
          </mesh>
        );
      })}
      <mesh castShadow receiveShadow position={[0, snowY, 0]}>
        <boxGeometry args={[snowW, snowH, snowD]} />
        <meshStandardMaterial
          color={SNOW_COLOR}
          roughness={0.92}
          metalness={0.03}
        />
      </mesh>
    </group>
  );
}
