"use client";

import type { IslandRect } from "@/lib/game/islands";

import { Bush } from "./Bush";

export function IslandBushes({
  islands,
}: {
  islands: readonly IslandRect[];
}) {
  return (
    <>
      {islands.flatMap((is, ii) =>
        is.bushes.map((b, bi) => (
          <Bush
            key={`island-${ii}-bush-${bi}-${b.ox}-${b.oz}`}
            worldX={is.worldX + b.ox}
            worldZ={is.worldZ + b.oz}
            seed={ii * 1000 + bi * 17 + Math.round(b.ox * 1e3)}
          />
        ))
      )}
    </>
  );
}
