"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import { BLOCK_SIZE, GOAL_PYRAMID_COLOR } from "@/lib/game/constants";
import type { Vec3 } from "@/lib/game/types";

/** Bottom radius so the 4-sided pyramid base matches the former goal cube footprint in XZ. */
const PYRAMID_BASE_RADIUS = BLOCK_SIZE / Math.sqrt(2);

function SpinningGoalSphere({ color }: { color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const r = 0.22;
  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 1.4;
  });
  const y = BLOCK_SIZE / 2 + r + 0.04;
  return (
    <mesh ref={meshRef} position={[0, y, 0]} castShadow>
      <sphereGeometry args={[r, 8, 6]} />
      <meshStandardMaterial
        color={color}
        roughness={0.35}
        metalness={0.12}
        transparent
        opacity={0.48}
        depthWrite={false}
      />
    </mesh>
  );
}

export function Block({ center, color }: { center: Vec3; color: string }) {
  return (
    <group position={[...center]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0, PYRAMID_BASE_RADIUS, BLOCK_SIZE, 4]} />
        <meshStandardMaterial
          color={GOAL_PYRAMID_COLOR}
          roughness={0.72}
          metalness={0.04}
        />
      </mesh>
      <SpinningGoalSphere color={color} />
    </group>
  );
}
