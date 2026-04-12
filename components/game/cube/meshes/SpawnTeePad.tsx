"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

import {
  FIELD_GROUND_SNOW,
  GOAL_GREEN,
  TEE_PAD_CENTER_Y,
  TEE_PAD_EXTEND_BACK_Z,
  TEE_PAD_HALF_X,
  TEE_PAD_HALF_Y,
  TEE_PAD_HALF_Z,
} from "@/lib/game/constants";
import type { BiomeId } from "@/lib/game/types";

/** Fixed tee pad at initial spawn (world origin): green like goal, or snow-tinted on winter biomes. */
export function SpawnTeePad({ biome }: { biome: BiomeId }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useLayoutEffect(() => {
    const m = meshRef.current;
    if (!m) return;
    m.raycast = () => {};
  }, []);

  /** Keep +Z edge at `+TEE_PAD_HALF_Z`; extend only backward so the sign sits on the pad. */
  const padDepthZ = TEE_PAD_HALF_Z * 2 + TEE_PAD_EXTEND_BACK_Z;
  const padCenterZ = -TEE_PAD_EXTEND_BACK_Z / 2;
  const snowTee = biome === "snow" || biome === "ice";
  const padColor = snowTee ? FIELD_GROUND_SNOW : GOAL_GREEN;

  return (
    <mesh
      ref={meshRef}
      position={[0, TEE_PAD_CENTER_Y - .55, padCenterZ]}
      receiveShadow
      castShadow
    >
      <boxGeometry
        args={[
          TEE_PAD_HALF_X * 2,
          TEE_PAD_HALF_Y * 6,
          padDepthZ,
        ]}
      />
      <meshStandardMaterial
        color={padColor}
        roughness={snowTee ? 0.78 : 0.65}
        metalness={snowTee ? 0.04 : 0.08}
        polygonOffset
        polygonOffsetFactor={1}
        polygonOffsetUnits={1}
      />
    </mesh>
  );
}
