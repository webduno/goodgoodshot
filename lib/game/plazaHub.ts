import type { IslandRect } from "@/lib/game/types";

/** Outer plaza footprint half-extent; includes wide edge ring + plinths. */
export const PLAZA_OUTER_HALF = 36;
/** Flat walkable turf half-extent; ball stays inside this inner square. */
export const PLAZA_WALKABLE_HALF = 22;

/** Light porcelain / sky-mist tones for the outer ring (Frutiger Aero; not physics). */
export const PLAZA_HUB_RING_SLAB = "#d4e6f0";
export const PLAZA_HUB_FOUNDATION_FRUSTUM = "#bfd4e4";

/** Single flat play area for the town / plaza hub (world units). */
export const PLAZA_HUB_ISLANDS: readonly IslandRect[] = [
  {
    worldX: 0,
    worldZ: 0,
    halfX: PLAZA_OUTER_HALF,
    halfZ: PLAZA_OUTER_HALF,
    walkableHalfX: PLAZA_WALKABLE_HALF,
    walkableHalfZ: PLAZA_WALKABLE_HALF,
    blockThickness: 0.72,
    bushes: [],
    trees: [],
  },
];
