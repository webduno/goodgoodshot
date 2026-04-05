"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

import type { Vec3 } from "@/lib/game/types";

/** Corner “wheels”: purely visual meshes (input comes from HUD). */
export function VehicleCornerBlock({
  position: pos,
  size,
  color,
}: {
  position: Vec3;
  size: number;
  color: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useLayoutEffect(() => {
    const m = meshRef.current;
    if (!m) return;
    m.raycast = () => {};
  }, []);

  return (
    <mesh ref={meshRef} position={[...pos]} castShadow receiveShadow>
      <boxGeometry args={[size, size, size]} />
      <meshStandardMaterial
        color={color}
        roughness={0.6}
        metalness={0.1}
      />
    </mesh>
  );
}
