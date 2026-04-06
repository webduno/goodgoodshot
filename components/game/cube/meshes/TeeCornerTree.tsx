"use client";

import {
  TEE_PAD_CENTER_Y,
  TEE_PAD_EXTEND_BACK_Z,
  TEE_PAD_HALF_X,
  TEE_PAD_HALF_Y,
  TEE_PAD_HALF_Z,
} from "@/lib/game/constants";

const PAD_MESH_CENTER_Y = TEE_PAD_CENTER_Y - 0.55;
const PAD_HALF_HEIGHT_Y = TEE_PAD_HALF_Y * 3;
const PAD_TOP_Y = PAD_MESH_CENTER_Y + PAD_HALF_HEIGHT_Y;

const TRUNK_W = 0.52;
const TRUNK_H = 1.9;
const TRUNK_D = 0.52;

const LEAF = 0.72;

/** Back-right corner of the tee (−Z, +X), beside the sign. */
const CORNER_INSET = 0.42;

type LeafSpec = {
  pos: readonly [number, number, number];
  rot: readonly [number, number, number];
};

const LEAVES: readonly LeafSpec[] = [
  { pos: [0, 0, 0], rot: [0, 0.35, 0] },
  { pos: [0.32, 0.1, 0.18], rot: [0.12, -0.28, 0.08] },
  { pos: [-0.34, 0.07, -0.16], rot: [-0.1, 0.4, -0.06] },
  { pos: [0.16, -0.12, 0.32], rot: [0.15, 0.2, -0.12] },
  { pos: [-0.26, 0.16, 0.22], rot: [-0.08, -0.35, 0.1] },
  { pos: [0.1, 0.18, -0.35], rot: [0.1, 0.15, 0.22] },
];

const TRUNK_COLOR = "#5c3d2e";
const LEAF_COLORS = [
  "#2f6b3c",
  "#3a7d47",
  "#347040",
  "#2d6338",
  "#3d8a4a",
  "#326b3e",
] as const;

/** Blocky tree (cubes only): trunk + six overlapping leaf cubes at the tee back corner. */
export function TeeCornerTree() {
  const x = TEE_PAD_HALF_X - CORNER_INSET;
  const z =
    -TEE_PAD_HALF_Z - TEE_PAD_EXTEND_BACK_Z + CORNER_INSET;

  const trunkCenterY = PAD_TOP_Y + TRUNK_H / 2;
  const leafGroupY = PAD_TOP_Y + TRUNK_H;

  return (
    <group position={[x, 0, z]}>
      <mesh castShadow receiveShadow position={[0, trunkCenterY, 0]}>
        <boxGeometry args={[TRUNK_W, TRUNK_H, TRUNK_D]} />
        <meshStandardMaterial
          color={TRUNK_COLOR}
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>
      <group position={[0, leafGroupY, 0]}>
        {LEAVES.map((leaf, i) => (
          <mesh
            key={`leaf-${i}`}
            castShadow
            receiveShadow
            position={[...leaf.pos]}
            rotation={[...leaf.rot]}
          >
            <boxGeometry args={[LEAF, LEAF, LEAF]} />
            <meshStandardMaterial
              color={LEAF_COLORS[i]}
              roughness={0.78}
              metalness={0.04}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
