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

  if (hatId === "pandaFace") {
    const baseY = HAT_BASE_Y;
    return (
      <group position={[0, baseY, 0]}>
        <mesh position={[0, 0.13, 0]} castShadow>
          <sphereGeometry args={[0.13, 16, 14]} />
          <meshStandardMaterial
            color="#f2f2f2"
            roughness={0.55}
            metalness={0.04}
          />
        </mesh>
        <mesh position={[-0.08, 0.19, 0]} castShadow>
          <sphereGeometry args={[0.045, 10, 8]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
        </mesh>
        <mesh position={[0.08, 0.19, 0]} castShadow>
          <sphereGeometry args={[0.045, 10, 8]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.5} />
        </mesh>
        <mesh position={[-0.04, 0.14, 0.11]} castShadow>
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshStandardMaterial color="#0d0d0d" roughness={0.45} />
        </mesh>
        <mesh position={[0.04, 0.14, 0.11]} castShadow>
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshStandardMaterial color="#0d0d0d" roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.095, 0.12]} castShadow>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshStandardMaterial color="#0d0d0d" roughness={0.45} />
        </mesh>
      </group>
    );
  }

  if (hatId === "messengerMini") {
    /** Same sphere layout as `GoalMessengerCharacter`, scaled to sit on the hull. */
    const SIZE = 0.35;
    const HEAD_R = 0.16 * SIZE;
    const BODY_R = 0.2 * SIZE;
    const ARM_R = 0.07 * SIZE;
    const bodyY = BODY_R;
    const headY = bodyY + BODY_R + HEAD_R;
    const virusMat = {
      color: "#38c968",
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      roughness: 0.38,
      metalness: 0.06,
    } as const;
    return (
      <group position={[0, HAT_BASE_Y, 0]}>
        <mesh position={[0, headY, 0]} castShadow>
          <sphereGeometry args={[HEAD_R, 12, 10]} />
          <meshStandardMaterial {...virusMat} />
        </mesh>
        <mesh position={[0, bodyY, 0]} castShadow scale={[1, 1.15, 1]}>
          <sphereGeometry args={[BODY_R, 14, 12]} />
          <meshStandardMaterial {...virusMat} />
        </mesh>
        <mesh
          position={[-BODY_R - ARM_R * 0.4, bodyY + 0.06 * SIZE, 0]}
          castShadow
          scale={[0.55, 1.15, 0.55]}
        >
          <sphereGeometry args={[ARM_R, 10, 8]} />
          <meshStandardMaterial {...virusMat} />
        </mesh>
        <mesh
          position={[BODY_R + ARM_R * 0.4, bodyY + 0.06 * SIZE, 0]}
          castShadow
          scale={[0.55, 1.15, 0.55]}
        >
          <sphereGeometry args={[ARM_R, 10, 8]} />
          <meshStandardMaterial {...virusMat} />
        </mesh>
      </group>
    );
  }

  if (hatId === "topHat") {
    return (
      <group position={[0, HAT_BASE_Y, 0]}>
        <mesh position={[0, 0.02, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.04, 24]} />
          <meshStandardMaterial
            color="#141414"
            roughness={0.42}
            metalness={0.18}
          />
        </mesh>
        <mesh position={[0, 0.15, 0]} castShadow>
          <cylinderGeometry args={[0.11, 0.14, 0.22, 24]} />
          <meshStandardMaterial
            color="#141414"
            roughness={0.42}
            metalness={0.18}
          />
        </mesh>
      </group>
    );
  }

  if (hatId === "simsPlumbob") {
    const r = 0.1;
    const yScale = 2.5;
    const h = r * 2 * yScale;
    return (
      <mesh
        position={[0, HAT_BASE_Y + h / 2, 0]}
        castShadow
        scale={[1, yScale, 1]}
      >
        <sphereGeometry args={[r, 6, 4]} />
        <meshStandardMaterial
          color="#3dcc55"
          emissive="#1a6628"
          emissiveIntensity={0.15}
          roughness={0.35}
          metalness={0.12}
        />
      </mesh>
    );
  }

  if (hatId === "bunnyEars") {
    return (
      <group position={[0, HAT_BASE_Y, 0]}>
        <mesh
          position={[-0.07, 0.17, 0]}
          rotation={[0, 0, -0.38]}
          scale={[0.42, 1.12, 0.42]}
          castShadow
        >
          <sphereGeometry args={[0.065, 10, 8]} />
          <meshStandardMaterial color="#fff5f8" roughness={0.45} />
        </mesh>
        <mesh
          position={[0.07, 0.17, 0]}
          rotation={[0, 0, 0.38]}
          scale={[0.42, 1.12, 0.42]}
          castShadow
        >
          <sphereGeometry args={[0.065, 10, 8]} />
          <meshStandardMaterial color="#fff5f8" roughness={0.45} />
        </mesh>
      </group>
    );
  }

  if (hatId === "crownHat") {
    const spikeCount = 6;
    const bandY = 0.045;
    const bandH = 0.05;
    return (
      <group position={[0, HAT_BASE_Y, 0]}>
        <mesh position={[0, bandY, 0]} castShadow>
          <cylinderGeometry args={[0.11, 0.12, bandH, 16]} />
          <meshStandardMaterial
            color="#d4a820"
            roughness={0.4}
            metalness={0.5}
          />
        </mesh>
        {Array.from({ length: spikeCount }, (_, i) => {
          const a = (i / spikeCount) * Math.PI * 2 + Math.PI / spikeCount;
          const rx = Math.sin(a) * 0.095;
          const rz = Math.cos(a) * 0.095;
          return (
            <mesh
              key={i}
              position={[rx, bandY + bandH / 2 + 0.055, rz]}
              castShadow
            >
              <cylinderGeometry args={[0.028, 0.04, 0.11, 8]} />
              <meshStandardMaterial
                color="#e8c030"
                roughness={0.38}
                metalness={0.55}
              />
            </mesh>
          );
        })}
      </group>
    );
  }

  return null;
}
