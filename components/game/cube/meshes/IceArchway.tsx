"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

import { TURF_TOP_Y } from "@/lib/game/constants";

const BASE_COLOR = "#f4f8fc";
const ICE_COLORS = [
  "#5eb8e8",
  "#4aa8dc",
  "#6ec4f0",
  "#4a9fd4",
] as const;

const ARCH_R = 1.05;
const SEGMENTS = 8;
const SEG_W = 0.32;
const SEG_H = 0.38;
const SEG_D = 0.87;
const BASE_W = 3.02;
const BASE_H = 0.17;
const BASE_D = 1.12;

/**
 * Segmented icy arch on a white slab; faces +Z as “front”. Visual-only (raycast off).
 */
export function IceArchway({
  worldX,
  worldZ,
  yaw,
  seed,
}: {
  worldX: number;
  worldZ: number;
  /** Y rotation (rad). */
  yaw: number;
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
  const icePick = ICE_COLORS[seed % ICE_COLORS.length]!;

  const arcPieces: { theta: number; key: string }[] = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const theta =
      SEGMENTS > 1 ? Math.PI - (i / (SEGMENTS - 1)) * Math.PI : Math.PI / 2;
    arcPieces.push({ theta, key: `arch-seg-${i}` });
  }

  return (
    <group ref={groupRef} position={[worldX, y0, worldZ]} rotation={[0, yaw, 0]}>
      <mesh castShadow receiveShadow position={[0, BASE_H / 2, 0]}>
        <boxGeometry args={[BASE_W, BASE_H, BASE_D]} />
        <meshStandardMaterial
          color={BASE_COLOR}
          roughness={0.88}
          metalness={0.04}
        />
      </mesh>
      <group position={[0, BASE_H, 0]}>
        {arcPieces.map(({ theta, key }) => {
          const cx = ARCH_R * 0.92 * Math.cos(theta);
          const cy = ARCH_R * 0.92 * Math.sin(theta);
          return (
            <mesh
              key={key}
              castShadow
              receiveShadow
              position={[cx, cy, 0]}
              rotation={[0, 0, theta + Math.PI / 2]}
            >
              <boxGeometry args={[SEG_W, SEG_H, SEG_D]} />
              <meshStandardMaterial
                color={icePick}
                roughness={0.38}
                metalness={0.16}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}
