"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

import {
  GOAL_GREEN,
  TEE_PAD_CENTER_Y,
  TEE_PAD_HALF_X,
  TEE_PAD_HALF_Y,
  TEE_PAD_HALF_Z,
} from "@/lib/game/constants";

/** Fixed tee pad at initial spawn (world origin): same green as goal, slightly above pond top. */
export function SpawnTeePad() {
  const meshRef = useRef<THREE.Mesh>(null);

  useLayoutEffect(() => {
    const m = meshRef.current;
    if (!m) return;
    m.raycast = () => {};
  }, []);

  return (
    <mesh
      ref={meshRef}
      position={[0, TEE_PAD_CENTER_Y - .55, 0]}
      receiveShadow
      castShadow
    >
      <boxGeometry
        args={[
          TEE_PAD_HALF_X * 2,
          TEE_PAD_HALF_Y * 6,
          TEE_PAD_HALF_Z * 2,
        ]}
      />
      <meshStandardMaterial
        color={GOAL_GREEN}
        roughness={0.65}
        metalness={0.08}
        polygonOffset
        polygonOffsetFactor={1}
        polygonOffsetUnits={1}
      />
    </mesh>
  );
}
