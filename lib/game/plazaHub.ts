import type { IslandRect } from "@/lib/game/types";

/** Single flat play area for the town / plaza hub (world units). */
export const PLAZA_HUB_ISLANDS: readonly IslandRect[] = [
  {
    worldX: 0,
    worldZ: 0,
    halfX: 25,
    halfZ: 25,
    blockThickness: 0.72,
    bushes: [],
    trees: [],
  },
];
