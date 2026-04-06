"use client";

import {
  TEE_PAD_CENTER_Y,
  TEE_PAD_EXTEND_BACK_Z,
  TEE_PAD_HALF_X,
  TEE_PAD_HALF_Y,
  TEE_PAD_HALF_Z,
} from "@/lib/game/constants";

import { BlockyTree } from "./BlockyTree";

const PAD_MESH_CENTER_Y = TEE_PAD_CENTER_Y - 0.55;
const PAD_HALF_HEIGHT_Y = TEE_PAD_HALF_Y * 3;
const PAD_TOP_Y = PAD_MESH_CENTER_Y + PAD_HALF_HEIGHT_Y;

/** Back-left corner of the tee (−Z, −X); sign uses back-right so they do not overlap. */
const CORNER_INSET = 0.42;
/** Slightly larger than fairway decorative trees. */
const TEE_TREE_SCALE = 1.28;

/** Blocky tree (cubes only): trunk + six overlapping leaf cubes at the tee back corner. */
export function TeeCornerTree() {
  const x = -(TEE_PAD_HALF_X - CORNER_INSET);
  const z =
    -TEE_PAD_HALF_Z - TEE_PAD_EXTEND_BACK_Z + CORNER_INSET;

  return (
    <group position={[x, PAD_TOP_Y, z]}>
      <group scale={[TEE_TREE_SCALE, TEE_TREE_SCALE, TEE_TREE_SCALE]}>
        <BlockyTree groundY={0} />
      </group>
    </group>
  );
}
