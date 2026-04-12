"use client";

import {
  TEE_PAD_EXTEND_BACK_Z,
  TEE_PAD_HALF_X,
  TEE_PAD_HALF_Z,
  TEE_PAD_TOP_Y,
} from "@/lib/game/constants";
import type { BiomeId } from "@/lib/game/types";

import { SnowmanDecor } from "./SnowmanDecor";

const PAD_CENTER_Z = -TEE_PAD_EXTEND_BACK_Z / 2;

/**
 * Snow/ice only: one snowman on the tee pad (right side, toward +Z — clear of back-left tree/sign).
 */
export function TeeSnowman({ biome }: { biome: BiomeId }) {
  if (biome !== "snow" && biome !== "ice") return null;

  const wx = TEE_PAD_HALF_X * 0.48;
  const wz = PAD_CENTER_Z + TEE_PAD_HALF_Z * 0.26;

  return (
    <SnowmanDecor
      worldX={wx}
      worldZ={wz}
      yaw={-0.55}
      seed={9021}
      groundY={TEE_PAD_TOP_Y}
    />
  );
}
