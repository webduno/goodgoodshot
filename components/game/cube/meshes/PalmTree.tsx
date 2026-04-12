"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Sea fairway palm: small sand mound up to `groundY`, then trunk + fronds (blocky style).
 * `groundY` matches `BlockyTree` — island turf top (`TURF_TOP_Y`) or tee pad top (0 in local space).
 * Fairway palms get a taller mound toward the “water”; tee palms get a short lip only.
 */
export function PalmTree({
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
  const fairwayPalm = groundY < -0.25;
  /** Slightly taller mound; tee keeps a shallow lip but still reads as beach. */
  const moundDepth = fairwayPalm ? 0.44 : 0.14;
  const moundBottom = groundY - moundDepth;
  const moundH = Math.max(0.08, groundY - moundBottom);
  const moundCenterY = moundBottom + moundH / 2;
  const moundRTop = fairwayPalm ? 2.35 : 1.75;
  const moundRBot = fairwayPalm ? 1.92 : 1.42;

  const trunkW = 0.22;
  const trunkH = 1.75;
  const frondY = groundY + trunkH;

  const frondSpecs: readonly {
    pos: readonly [number, number, number];
    rot: readonly [number, number, number];
    len: number;
  }[] = [
    { pos: [0.52, 0.08, 0.1], rot: [0.12, 0.05, 0.35], len: 0.62 },
    { pos: [-0.48, 0.06, 0.14], rot: [0.1, -0.2, -0.32], len: 0.58 },
    { pos: [0.12, 0.05, -0.54], rot: [-0.28, 0.15, 0.08], len: 0.6 },
    { pos: [-0.1, 0.07, -0.5], rot: [0.22, -0.12, -0.1], len: 0.55 },
    { pos: [0.38, 0.12, -0.32], rot: [-0.15, 0.28, 0.22], len: 0.52 },
    { pos: [-0.36, 0.1, 0.34], rot: [0.08, -0.25, -0.18], len: 0.54 },
    { pos: [0.02, 0.14, 0.46], rot: [-0.35, 0, 0], len: 0.5 },
  ];

  return (
    <group ref={groupRef} rotation={[0, yaw, 0]}>
      <mesh
        castShadow
        receiveShadow
        position={[0, moundCenterY, 0]}
      >
        <cylinderGeometry args={[moundRTop, moundRBot, moundH, 12]} />
        <meshStandardMaterial
          color="#d4b896"
          roughness={0.88}
          metalness={0.04}
        />
      </mesh>
      <mesh
        castShadow
        receiveShadow
        position={[0, groundY + trunkH / 2, 0]}
      >
        <boxGeometry args={[trunkW, trunkH, trunkW]} />
        <meshStandardMaterial
          color="#6b4a36"
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>
      <group position={[0, frondY, 0]}>
        {frondSpecs.map((f, i) => (
          <mesh
            key={`frond-${i}`}
            castShadow
            receiveShadow
            position={[...f.pos]}
            rotation={[...f.rot]}
          >
            <boxGeometry args={[f.len, 0.14, 0.42]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? "#2f6b3d" : "#3a7d48"}
              roughness={0.78}
              metalness={0.04}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
