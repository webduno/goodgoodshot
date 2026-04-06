"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";

const STEM_W = 0.48;
const STEM_H = 1.15;
const PAD = 0.62;

const STEM_COLORS = ["#c45c28", "#d47032", "#b84e20"] as const;
const PAD_COLORS = ["#e8883a", "#f29a48", "#dc7a30", "#eea055"] as const;

type PadSpec = {
  pos: readonly [number, number, number];
  rot: readonly [number, number, number];
};

const PADS: readonly PadSpec[] = [
  { pos: [0.28, 0.35, 0.1], rot: [0.1, 0.45, 0.08] },
  { pos: [-0.32, 0.55, -0.06], rot: [-0.06, -0.4, 0.05] },
  { pos: [0.12, 0.75, 0.28], rot: [0.12, 0.2, -0.1] },
];

/**
 * Blocky desert cactus (orange cubes): stem + offset pads — mirrors `BlockyTree` layout role.
 */
export function BlockyCactus({
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

  return (
    <group ref={groupRef} rotation={[0, yaw, 0]}>
      <mesh castShadow receiveShadow position={[0, groundY + STEM_H / 2, 0]}>
        <boxGeometry args={[STEM_W, STEM_H, STEM_W]} />
        <meshStandardMaterial
          color={STEM_COLORS[0]}
          roughness={0.88}
          metalness={0.04}
        />
      </mesh>
      <group position={[0, groundY + STEM_H * 0.35, 0]}>
        {PADS.map((p, i) => (
          <mesh
            key={`pad-${i}`}
            castShadow
            receiveShadow
            position={[...p.pos]}
            rotation={[...p.rot]}
          >
            <boxGeometry args={[PAD, PAD, PAD]} />
            <meshStandardMaterial
              color={PAD_COLORS[i % PAD_COLORS.length]}
              roughness={0.82}
              metalness={0.05}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
