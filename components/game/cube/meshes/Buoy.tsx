"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

import { TURF_TOP_Y } from "@/lib/game/constants";

/**
 * Lane marker buoy (replaces bushes on sea biome). Sits on the turf top; visual-only raycasts off.
 */
export function Buoy({
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

  const yaw = (seed % 997) * 0.001 * Math.PI * 2;
  const bob = ((seed % 50) / 50) * 0.04;
  const y0 = TURF_TOP_Y;
  const bodyR = 0.16;
  const bodyH = 0.44;
  const bodyCenterY = bodyH / 2;

  return (
    <group
      ref={groupRef}
      position={[worldX, y0, worldZ]}
      rotation={[0, yaw, 0]}
    >
      <group position={[0, bodyCenterY + bob, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[bodyR, bodyR, bodyH, 14]} />
          <meshStandardMaterial
            color="#f5f5f5"
            roughness={0.42}
            metalness={0.18}
          />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
          <cylinderGeometry args={[bodyR * 1.02, bodyR * 1.02, 0.12, 14]} />
          <meshStandardMaterial
            color="#d62828"
            roughness={0.55}
            metalness={0.12}
          />
        </mesh>
        <mesh castShadow receiveShadow position={[0, bodyH / 2 + 0.12, 0]}>
          <sphereGeometry args={[0.11, 12, 10]} />
          <meshStandardMaterial
            color="#c62828"
            roughness={0.48}
            metalness={0.2}
          />
        </mesh>
        <mesh castShadow position={[0, bodyH / 2 + 0.26, 0]}>
          <cylinderGeometry args={[0.02, 0.03, 0.2, 6]} />
          <meshStandardMaterial
            color="#2a2a2a"
            roughness={0.75}
            metalness={0.15}
          />
        </mesh>
      </group>
    </group>
  );
}
