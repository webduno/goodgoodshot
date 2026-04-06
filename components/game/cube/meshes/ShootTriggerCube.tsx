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
  phase,
  onFireInput,
}: {
  /** ready = red (can start shot); charging = orange (charge window); inactive = grey (ball / cooldown / locked). */
  phase: "ready" | "charging" | "inactive";
  onFireInput: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const z = -BLOCK_SIZE / 2 - SHOOT_TRIGGER_CUBE_SIZE / 2;
  const clickable = phase !== "inactive";

  useLayoutEffect(() => {
    const m = meshRef.current;
    if (!m) return;
    const defaultRaycast = THREE.Mesh.prototype.raycast.bind(m);
    m.raycast = clickable ? defaultRaycast : () => {};
  }, [clickable]);

  const color =
    phase === "ready"
      ? "#c62828"
      : phase === "charging"
        ? "#ea580c"
        : "#8a8a8a";

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
        color={color}
        roughness={0.35}
        metalness={0.15}
      />
    </mesh>
  );
}
