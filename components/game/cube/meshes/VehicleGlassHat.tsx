"use client";

import { useMemo } from "react";
import * as THREE from "three";

import { BLOCK_SIZE } from "@/lib/game/constants";
import type { HatId } from "@/lib/shop/playerInventory";

const HAT_BASE_Y = BLOCK_SIZE * 0.52 + 0.12;

function glassHatMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: "#a8d8ff",
    transparent: true,
    opacity: 0.5,
    roughness: 0.08,
    metalness: 0.06,
    transmission: 0.55,
    thickness: 0.45,
    ior: 1.42,
    attenuationColor: new THREE.Color("#7ec8f8"),
    attenuationDistance: 0.75,
    emissive: "#a8d8ff",
    emissiveIntensity: 0.06,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/**
 * Cosmetic glass primitive on top of the vehicle hull (local space, parent follows body yaw).
 */
export function VehicleGlassHat({ hatId }: { hatId: HatId | null }) {
  const mat = useMemo(() => glassHatMaterial(), []);

  if (hatId === null) return null;

  if (hatId === "glassPyramid") {
    const h = 0.34;
    const r = 0.2;
    return (
      <mesh
        position={[0, HAT_BASE_Y + h / 2, 0]}
        rotation={[0, Math.PI / 4, 0]}
        material={mat}
        castShadow
      >
        <coneGeometry args={[r, h, 4]} />
      </mesh>
    );
  }

  if (hatId === "glassCube") {
    const s = 0.26;
    return (
      <mesh
        position={[0, HAT_BASE_Y + s / 2, 0]}
        material={mat}
        castShadow
      >
        <boxGeometry args={[s, s, s]} />
      </mesh>
    );
  }

  if (hatId === "glassSphere") {
    const r = 0.17;
    return (
      <mesh
        position={[0, HAT_BASE_Y + r, 0]}
        material={mat}
        castShadow
      >
        <sphereGeometry args={[r, 20, 20]} />
      </mesh>
    );
  }

  return null;
}
