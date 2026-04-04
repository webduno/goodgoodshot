"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { AIM_PRISM_COLOR, AIM_PRISM_RADIUS } from "@/lib/game/constants";
import type { Vec3 } from "@/lib/game/types";

/**
 * 3-sided cylinder (triangular prism) along the shot direction from the cube center.
 * Default elevation comes from the vehicle; horizontal aim is `aimYawRad`. Pivot is the
 * spawn block center (middle of the cube). Raycast disabled so it does not steal clicks.
 */
export function AimYawPrism({
  spawnCenter,
  aimYawRad,
  defaultVerticalAngleRad,
  prismLength,
  color,
}: {
  spawnCenter: Vec3;
  aimYawRad: number;
  /** Pitch above horizontal (radians), from vehicle config — matches launch trajectory. */
  defaultVerticalAngleRad: number;
  /** Cylinder height along aim; scales with vehicle base strength. */
  prismLength: number;
  /** Aim wedge tint; defaults to light cyan when omitted. */
  color?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useLayoutEffect(() => {
    const m = meshRef.current;
    if (!m) return;
    m.raycast = () => {};
  }, []);

  const { position, quaternion } = useMemo(() => {
    const cosP = Math.cos(defaultVerticalAngleRad);
    const sinP = Math.sin(defaultVerticalAngleRad);
    const sinY = Math.sin(aimYawRad);
    const cosY = Math.cos(aimYawRad);
    const dir = new THREE.Vector3(
      sinY * cosP,
      sinP,
      cosY * cosP
    ).normalize();
    const sx = spawnCenter[0];
    const sy = spawnCenter[1];
    const sz = spawnCenter[2];
    const h = prismLength;
    const pos = new THREE.Vector3(
      sx + dir.x * (h / 2),
      sy + dir.y * (h / 2),
      sz + dir.z * (h / 2)
    );
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return { position: pos, quaternion: q };
  }, [spawnCenter, aimYawRad, defaultVerticalAngleRad, prismLength]);

  return (
    <mesh
      ref={meshRef}
      position={position}
      quaternion={quaternion}
      castShadow
      receiveShadow
    >
      <cylinderGeometry
        args={[AIM_PRISM_RADIUS, AIM_PRISM_RADIUS, prismLength, 3]}
      />
      <meshStandardMaterial
        color={color ?? AIM_PRISM_COLOR}
        roughness={0.28}
        metalness={0.22}
      />
    </mesh>
  );
}
