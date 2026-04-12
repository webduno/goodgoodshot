"use client";

import { biomeUsesCactus } from "@/lib/game/biomes";
import { PALM_DECOR_Y_LIFT, TURF_TOP_Y } from "@/lib/game/constants";
import type { IslandRect } from "@/lib/game/islands";
import type { BiomeId } from "@/lib/game/types";

import { BlockyCactus } from "./BlockyCactus";
import { BlockyTree } from "./BlockyTree";
import { InstancedBlockyTrees } from "./InstancedBlockyTrees";
import { PalmTree } from "./PalmTree";
import { SnowPineTree } from "./SnowPineTree";

/** Fairway trees: thinner on X/Z only (tee tree scales separately in `TeeCornerTree`). */
const ISLAND_TREE_XZ_SCALE = 0.68;
/** Snow/ice fairway pines: much taller than default mesh height. */
const ISLAND_SNOW_PINE_Y_SCALE = 2.05;

export function IslandTrees({
  islands,
  biome,
}: {
  islands: readonly IslandRect[];
  biome: BiomeId;
}) {
  /** Instanced `BlockyTree` fairway props for draw-call experiment (plain biome only). */
  if (biome === "plain") {
    return <InstancedBlockyTrees islands={islands} />;
  }

  const TreeMesh =
    biome === "snow" || biome === "ice"
      ? SnowPineTree
      : biome === "sea"
        ? PalmTree
        : biomeUsesCactus(biome)
          ? BlockyCactus
          : BlockyTree;
  const isSnowPine = biome === "snow" || biome === "ice";
  const islandTreeY = biome === "sea" ? PALM_DECOR_Y_LIFT : 0;
  return (
    <>
      {islands.flatMap((is, ii) =>
        is.trees.map((t, ti) => {
          const seed =
            ii * 7919 + ti * 4999 + Math.round(t.ox * 1e3);
          return (
            <group
              key={`island-${ii}-tree-${ti}-${t.ox}-${t.oz}`}
              position={[is.worldX + t.ox, islandTreeY, is.worldZ + t.oz]}
            >
              {isSnowPine ? (
                <group position={[0, TURF_TOP_Y, 0]}>
                  <group
                    scale={[
                      ISLAND_TREE_XZ_SCALE,
                      ISLAND_SNOW_PINE_Y_SCALE,
                      ISLAND_TREE_XZ_SCALE,
                    ]}
                  >
                    <TreeMesh
                      groundY={0}
                      seed={seed}
                      raycastDisabled
                    />
                  </group>
                </group>
              ) : (
                <group
                  scale={[
                    ISLAND_TREE_XZ_SCALE,
                    1,
                    ISLAND_TREE_XZ_SCALE,
                  ]}
                >
                  <TreeMesh
                    groundY={TURF_TOP_Y}
                    seed={seed}
                    raycastDisabled
                  />
                </group>
              )}
            </group>
          );
        })
      )}
    </>
  );
}
