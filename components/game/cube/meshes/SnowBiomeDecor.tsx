"use client";

import { BLOCK_SIZE } from "@/lib/game/constants";
import type { IslandRect } from "@/lib/game/islands";
import type { BiomeId, Vec3 } from "@/lib/game/types";

import { IceArchway } from "./IceArchway";

const MIN_SPAWN_GOAL = 2.35 * BLOCK_SIZE;
const MIN_COIN = 2.2 * BLOCK_SIZE;
const MIN_ARCH_SEP = 4.85 * BLOCK_SIZE;

type Cand = {
  wx: number;
  wz: number;
  seed: number;
};

function coinOffset(is: IslandRect): { ox: number; oz: number } {
  return {
    ox: Math.round(is.worldX) - is.worldX,
    oz: Math.round(is.worldZ) - is.worldZ,
  };
}

function isClearSpot(
  wx: number,
  wz: number,
  ox: number,
  oz: number,
  is: IslandRect,
  spawnCenter: Vec3,
  goalCenter: Vec3
): boolean {
  const margin = 0.38 * BLOCK_SIZE;
  if (
    Math.abs(ox) > is.halfX - margin ||
    Math.abs(oz) > is.halfZ - margin
  ) {
    return false;
  }
  const { ox: coinOx, oz: coinOz } = coinOffset(is);
  if (Math.hypot(ox - coinOx, oz - coinOz) < MIN_COIN) return false;
  const ds = Math.hypot(wx - spawnCenter[0], wz - spawnCenter[2]);
  const dg = Math.hypot(wx - goalCenter[0], wz - goalCenter[2]);
  if (ds < MIN_SPAWN_GOAL) return false;
  if (dg < MIN_SPAWN_GOAL) return false;
  return true;
}

function collectCandidates(
  islands: readonly IslandRect[],
  spawnCenter: Vec3,
  goalCenter: Vec3
): Cand[] {
  const out: Cand[] = [];
  const offsets: readonly [number, number][] = [
    [0.58, 0.58],
    [-0.58, 0.58],
    [0.58, -0.58],
    [-0.58, -0.58],
    [0, 0.74],
    [0, -0.74],
    [0.74, 0],
    [-0.74, 0],
    [0.42, 0],
    [0, 0.5],
  ];
  for (let ii = 0; ii < islands.length; ii++) {
    const is = islands[ii]!;
    for (let oi = 0; oi < offsets.length; oi++) {
      const [fx, fz] = offsets[oi]!;
      const ox = fx * is.halfX;
      const oz = fz * is.halfZ;
      const wx = is.worldX + ox;
      const wz = is.worldZ + oz;
      if (!isClearSpot(wx, wz, ox, oz, is, spawnCenter, goalCenter)) continue;
      out.push({ wx, wz, seed: ii * 7919 + oi * 97 });
    }
  }
  return out;
}

function dist2D(a: Cand, b: Cand): number {
  return Math.hypot(a.wx - b.wx, a.wz - b.wz);
}

/**
 * Extra snow/ice props: blue archways on fairways. Snowman is tee-only (`TeeSnowman`).
 */
export function SnowBiomeDecor({
  islands,
  biome,
  spawnCenter,
  goalCenter,
}: {
  islands: readonly IslandRect[];
  biome: BiomeId;
  spawnCenter: Vec3;
  goalCenter: Vec3;
}) {
  if (biome !== "snow" && biome !== "ice") return null;
  if (islands.length === 0) return null;

  const cands = collectCandidates(islands, spawnCenter, goalCenter);
  if (cands.length === 0) return null;

  const arch1 = cands[0]!;
  let arch2: Cand | null = null;
  for (const c of cands) {
    if (dist2D(c, arch1) >= MIN_ARCH_SEP) {
      arch2 = c;
      break;
    }
  }

  const yawA = (arch1.seed % 628) * 0.01;
  const yawB = arch2 ? (arch2.seed % 628) * 0.01 + 0.9 : yawA;

  return (
    <>
      <IceArchway
        worldX={arch1.wx}
        worldZ={arch1.wz}
        yaw={yawA}
        seed={arch1.seed}
      />
      {arch2 ? (
        <IceArchway
          worldX={arch2.wx}
          worldZ={arch2.wz}
          yaw={yawB}
          seed={arch2.seed + 11}
        />
      ) : null}
    </>
  );
}
