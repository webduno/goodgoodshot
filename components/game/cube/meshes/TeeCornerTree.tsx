"use client";

import {
  PALM_DECOR_Y_LIFT,
  TEE_PAD_CENTER_Y,
  TEE_PAD_EXTEND_BACK_Z,
  TEE_PAD_HALF_X,
  TEE_PAD_HALF_Y,
  TEE_PAD_HALF_Z,
} from "@/lib/game/constants";

import { biomeUsesCactus } from "@/lib/game/biomes";
import type { BiomeId } from "@/lib/game/types";

import { BlockyCactus } from "./BlockyCactus";
import { BlockyTree } from "./BlockyTree";
import { PalmTree } from "./PalmTree";
import { SnowPineTree } from "./SnowPineTree";

const PAD_MESH_CENTER_Y = TEE_PAD_CENTER_Y - 0.55;
const PAD_HALF_HEIGHT_Y = TEE_PAD_HALF_Y * 3;
const PAD_TOP_Y = PAD_MESH_CENTER_Y + PAD_HALF_HEIGHT_Y;

/** Back-left corner of the tee (−Z, −X); sign uses back-right so they do not overlap. */
const CORNER_INSET = 0.42;
/** Slightly larger than fairway decorative trees. */
const TEE_TREE_SCALE = 1.28;
/** Blocky tree, snow pine cone, or desert cactus at the tee back corner. */
export function TeeCornerTree({ biome }: { biome: BiomeId }) {
  const x = -(TEE_PAD_HALF_X - CORNER_INSET);
  const z =
    -TEE_PAD_HALF_Z - TEE_PAD_EXTEND_BACK_Z + CORNER_INSET;
  const y =
    biome === "sea" ? PAD_TOP_Y + PALM_DECOR_Y_LIFT : PAD_TOP_Y;

  const Deco =
    biome === "snow" || biome === "ice"
      ? SnowPineTree
      : biome === "sea"
        ? PalmTree
        : biomeUsesCactus(biome)
          ? BlockyCactus
          : BlockyTree;

  return (
    <group position={[x, y, z]}>
      <group scale={[TEE_TREE_SCALE, TEE_TREE_SCALE, TEE_TREE_SCALE]}>
        <Deco groundY={0} />
      </group>
    </group>
  );
}
