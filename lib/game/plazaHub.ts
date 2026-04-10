import type { IslandRect } from "@/lib/game/types";

/** Outer plaza footprint half-extent; includes wide edge ring + plinths. */
export const PLAZA_OUTER_HALF = 54;
/** Flat walkable turf half-extent; ball stays inside this inner square. */
export const PLAZA_WALKABLE_HALF = 40;

/** Inner walkable turf — slightly more saturated than `FIELD_GROUND_MUTED_GREEN` (plain course). */
export const PLAZA_HUB_TURF_GREEN = "#2cfb26";

/** Light porcelain / sky-mist tones for the outer ring (Frutiger Aero; not physics). */
export const PLAZA_HUB_RING_SLAB = "#d4e6f0";
export const PLAZA_HUB_FOUNDATION_FRUSTUM = "#bfd4e4";

/** Decorative ~30×30 hill islands (no physics); sit just outside the hub slab. */
export const PLAZA_DECOR_HILL_HALF_EXTENT = 15;
/** Clearance from hub outer edge (±`PLAZA_OUTER_HALF`) to the near edge of a decor island. */
export const PLAZA_DECOR_HILL_RING_GAP = 4;
const PLAZA_DECOR_HILL_ORBIT =
  PLAZA_OUTER_HALF + PLAZA_DECOR_HILL_RING_GAP + PLAZA_DECOR_HILL_HALF_EXTENT;

/** World XZ centers; mesh bases sit at `TURF_TOP_Y`. */
export const PLAZA_DECOR_HILL_CENTERS: readonly { x: number; z: number }[] = [
  { x: 0, z: PLAZA_DECOR_HILL_ORBIT },
  { x: 0, z: -PLAZA_DECOR_HILL_ORBIT },
];

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
