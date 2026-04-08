"use client";

import { biomeUsesCactus } from "@/lib/game/biomes";
import { TURF_TOP_Y } from "@/lib/game/constants";
import type { IslandRect } from "@/lib/game/islands";
import type { BiomeId } from "@/lib/game/types";

import { BlockyCactus } from "./BlockyCactus";
import { BlockyTree } from "./BlockyTree";
import { InstancedBlockyTrees } from "./InstancedBlockyTrees";
import { SnowPineTree } from "./SnowPineTree";

/** Fairway trees: thinner on X/Z only (tee tree scales separately in `TeeCornerTree`). */
const ISLAND_TREE_XZ_SCALE = 0.68;

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
    biome === "snow"
      ? SnowPineTree
      : biomeUsesCactus(biome)
        ? BlockyCactus
        : BlockyTree;
  return (
    <>
      {islands.flatMap((is, ii) =>
        is.trees.map((t, ti) => (
          <group
            key={`island-${ii}-tree-${ti}-${t.ox}-${t.oz}`}
            position={[is.worldX + t.ox, 0, is.worldZ + t.oz]}
          >
            <group
              scale={[
                ISLAND_TREE_XZ_SCALE,
                1,
                ISLAND_TREE_XZ_SCALE,
              ]}
            >
              <TreeMesh
                groundY={TURF_TOP_Y}
                seed={ii * 7919 + ti * 4999 + Math.round(t.ox * 1e3)}
                raycastDisabled
              />
            </group>
          </group>
        ))
      )}
    </>
  );
}
