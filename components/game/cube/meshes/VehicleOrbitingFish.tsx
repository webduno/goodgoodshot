"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { FISH_COLOR_HEX } from "@/lib/shop/aquariumCatalog";
import type { FishId } from "@/lib/shop/playerInventory";

/** Horizontal orbit radius in vehicle-local space (inside body yaw group). */
const ORBIT_R = 0.99;
/** Height above vehicle origin (hull sits near y ≈ 0). */
const ORBIT_Y = 0.36;
/** Same cone proportions as plaza aquarium fish, scaled down. */
const CONE_R = 0.07;
const CONE_H = 0.26;
const ORBIT_SPEED = 1.05;

/**
 * One low-cost cone “fish” orbiting the vehicle; `MeshBasicMaterial`, single `useFrame`.
 */
export function VehicleOrbitingFish({ fishId }: { fishId: FishId }) {
  const orbitRef = useRef<THREE.Group>(null);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        toneMapped: false,
      }),
    []
  );

  useEffect(() => {
    return () => {
      mat.dispose();
    };
  }, [mat]);

  useLayoutEffect(() => {
    mat.color.set(FISH_COLOR_HEX[fishId]);
  }, [fishId, mat]);

  useFrame((_, delta) => {
    const g = orbitRef.current;
    if (!g) return;
    g.rotation.y += delta * ORBIT_SPEED;
  });

  return (
    <group ref={orbitRef}>
      <group position={[ORBIT_R, ORBIT_Y, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh rotation={[0, 0, -Math.PI / 2]} material={mat}>
          <coneGeometry args={[CONE_R, CONE_H, 5, 1, false]} />
        </mesh>
      </group>
    </group>
  );
}
