"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

/** Cone foliage; trunk is a separate cylinder so bark reads clearly. */
const BASE_HEIGHT = 2.75;
const BASE_RADIUS = 0.44;
const RADIAL_SEGMENTS = 10;
/** Share of total height for foliage so trunk + cone ≈ former single-cone height. */
const FOLIAGE_HEIGHT_FRAC = 0.68;

const TRUNK_COLOR = "#4a3528";
const TRUNK_ROUGHNESS = 0.88;
const TRUNK_METALNESS = 0.05;
const BASE_TRUNK_H = 0.92;
const BASE_TRUNK_R = 0.24;

const PINE_COLOR = "#2a4d42";
const PINE_ROUGHNESS = 0.82;
const PINE_METALNESS = 0.06;

/**
 * Snow fairway tree: brown trunk + frosted cone foliage.
 * `groundY` is the world Y of the tree base (tee pad top or `TURF_TOP_Y`).
 */
export function SnowPineTree({
  groundY,
  seed = 0,
  raycastDisabled = false,
}: {
  groundY: number;
  seed?: number;
  raycastDisabled?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    if (!raycastDisabled) return;
    const g = groupRef.current;
    if (!g) return;
    g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).raycast = () => {};
    });
  }, [raycastDisabled]);

  const yaw = (seed % 10007) * 0.0001 * Math.PI * 2;
  const hScale = 0.94 + ((seed >>> 3) % 13) * 0.012;
  const rScale = 0.92 + ((seed >>> 7) % 11) * 0.01;
  const trunkH = BASE_TRUNK_H * (0.96 + ((seed >>> 5) % 7) * 0.012);
  const trunkR = BASE_TRUNK_R * (0.94 + ((seed >>> 9) % 5) * 0.015);
  const coneHeight = BASE_HEIGHT * hScale * FOLIAGE_HEIGHT_FRAC;
  const radius = BASE_RADIUS * rScale;
  const trunkTopY = groundY + trunkH;

  return (
    <group ref={groupRef} rotation={[0, yaw, 0]}>
      <mesh
        castShadow
        receiveShadow
        position={[0, groundY + trunkH / 2, 0]}
      >
        <cylinderGeometry args={[trunkR, trunkR, trunkH, 8]} />
        <meshStandardMaterial
          color={TRUNK_COLOR}
          roughness={TRUNK_ROUGHNESS}
          metalness={TRUNK_METALNESS}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        position={[0, trunkTopY + coneHeight / 2, 0]}
      >
        <coneGeometry args={[radius, coneHeight, RADIAL_SEGMENTS]} />
        <meshStandardMaterial
          color={PINE_COLOR}
          roughness={PINE_ROUGHNESS}
          metalness={PINE_METALNESS}
        />
      </mesh>
    </group>
  );
}
