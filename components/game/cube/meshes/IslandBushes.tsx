"use client";

import type { IslandRect } from "@/lib/game/islands";
import type { BiomeId } from "@/lib/game/types";

import { Bush } from "./Bush";
import { DeadBush } from "./DeadBush";

export function IslandBushes({
  islands,
  biome,
}: {
  islands: readonly IslandRect[];
  biome: BiomeId;
}) {
  return (
    <>
      {islands.flatMap((is, ii) =>
        is.bushes.map((b, bi) => {
          const seed = ii * 1000 + bi * 17 + Math.round(b.ox * 1e3);
          const wx = is.worldX + b.ox;
          const wz = is.worldZ + b.oz;
          if (biome === "desert") {
            return (
              <DeadBush
                key={`island-${ii}-bush-${bi}-${b.ox}-${b.oz}`}
                worldX={wx}
                worldZ={wz}
                seed={seed}
              />
            );
          }
          return (
            <Bush
              key={`island-${ii}-bush-${bi}-${b.ox}-${b.oz}`}
              worldX={wx}
              worldZ={wz}
              seed={seed}
            />
          );
        })
      )}
    </>
  );
}
