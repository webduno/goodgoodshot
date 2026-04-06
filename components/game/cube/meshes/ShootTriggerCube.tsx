"use client";

import {
  BLOCK_SIZE,
  SHOOT_TRIGGER_CUBE_SIZE,
} from "@/lib/game/constants";
import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Small cube on the rear of the vehicle (not part of bodyParts). Parented to the
 * same yaw group as the hull so it rotates with the tank; click calls the same
 * handler as the Fire button / Space.
 */
export function ShootTriggerCube({
  ready,
  onFireInput,
}: {
  ready: boolean;
  onFireInput: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const z = -BLOCK_SIZE / 2 - SHOOT_TRIGGER_CUBE_SIZE / 2;

  useLayoutEffect(() => {
    const m = meshRef.current;
    if (!m) return;
    const defaultRaycast = THREE.Mesh.prototype.raycast.bind(m);
    m.raycast = ready ? defaultRaycast : () => {};
  }, [ready]);

  return (
    <mesh
      ref={meshRef}
      position={[0, 0, z]}
      castShadow
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        onFireInput();
      }}
    >
      <boxGeometry args={[SHOOT_TRIGGER_CUBE_SIZE, SHOOT_TRIGGER_CUBE_SIZE, SHOOT_TRIGGER_CUBE_SIZE]} />
      <meshStandardMaterial
        color={ready ? "#c62828" : "#8a8a8a"}
        roughness={0.35}
        metalness={0.15}
      />
    </mesh>
  );
}
