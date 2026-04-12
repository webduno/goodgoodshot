"use client";

import { biomeUsesDeadBush } from "@/lib/game/biomes";
import type { IslandRect } from "@/lib/game/islands";
import type { BiomeId } from "@/lib/game/types";

import { Bush } from "./Bush";
import { DeadBush } from "./DeadBush";
import { IceSpikeBush } from "./IceSpikeBush";
import { SnowCubeBush } from "./SnowCubeBush";

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
          if (biome === "snow" || biome === "ice") {
            const pairAng = (seed % 628) * 0.01;
            const pairOff = 0.4;
            const bx = wx + Math.cos(pairAng) * pairOff;
            const bz = wz + Math.sin(pairAng) * pairOff;
            return (
              <group
                key={`island-${ii}-bush-${bi}-${b.ox}-${b.oz}`}
              >
                <IceSpikeBush
                  worldX={wx}
                  worldZ={wz}
                  seed={seed}
                />
                <SnowCubeBush
                  worldX={bx}
                  worldZ={bz}
                  seed={seed + 31}
                />
              </group>
            );
          }
          if (biomeUsesDeadBush(biome)) {
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
