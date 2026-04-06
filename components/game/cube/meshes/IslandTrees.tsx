"use client";

import { TURF_TOP_Y } from "@/lib/game/constants";
import type { IslandRect } from "@/lib/game/islands";

import { BlockyTree } from "./BlockyTree";

/** Fairway trees: thinner on X/Z only (tee tree scales separately in `TeeCornerTree`). */
const ISLAND_TREE_XZ_SCALE = 0.68;

export function IslandTrees({
  islands,
}: {
  islands: readonly IslandRect[];
}) {
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
              <BlockyTree
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
