import type { IslandRect } from "@/lib/game/types";

/** Outer plaza footprint half-extent; includes wide edge ring + plinths. */
export const PLAZA_OUTER_HALF = 54;
/** Flat walkable turf half-extent; ball stays inside this inner square. */
export const PLAZA_WALKABLE_HALF = 40;

/** Cardinal torus portals — inside the walkable edge so they sit nearer the hub center. */
export const PLAZA_PORTAL_ORBIT = 32;

/** Vibe Jam webring exit — east-northeast inside walkable (cardinals use ±32 on axes). */
export const PLAZA_VIBE_JAM_PORTAL_EXIT_X = 15;
export const PLAZA_VIBE_JAM_PORTAL_EXIT_Z = 12;

/** Return portal (shown when `?portal=true` & `?ref=`) — southwest, mirrored. */
export const PLAZA_VIBE_JAM_PORTAL_RETURN_X = -30;
export const PLAZA_VIBE_JAM_PORTAL_RETURN_Z = -22;

const VIBE_JAM_SPAWN_INWARD = 5;
const VIBE_JAM_RETURN_LEN = Math.hypot(
  -PLAZA_VIBE_JAM_PORTAL_RETURN_X,
  -PLAZA_VIBE_JAM_PORTAL_RETURN_Z
);

/** Ball spawn just inside the return portal, toward the hub center. */
export const PLAZA_VIBE_JAM_SPAWN_X =
  PLAZA_VIBE_JAM_PORTAL_RETURN_X +
  (-PLAZA_VIBE_JAM_PORTAL_RETURN_X / VIBE_JAM_RETURN_LEN) * VIBE_JAM_SPAWN_INWARD;
export const PLAZA_VIBE_JAM_SPAWN_Z =
  PLAZA_VIBE_JAM_PORTAL_RETURN_Z +
  (-PLAZA_VIBE_JAM_PORTAL_RETURN_Z / VIBE_JAM_RETURN_LEN) * VIBE_JAM_SPAWN_INWARD;

/** Same convention as other plaza torus portals: `rotationY = -atan2(px, pz)`. */
export function plazaVibeJamExitRotationY(): number {
  return -Math.atan2(-PLAZA_VIBE_JAM_PORTAL_EXIT_X, PLAZA_VIBE_JAM_PORTAL_EXIT_Z);
}

export function plazaVibeJamReturnRotationY(): number {
  return -Math.atan2(
    PLAZA_VIBE_JAM_PORTAL_RETURN_X,
    PLAZA_VIBE_JAM_PORTAL_RETURN_Z
  );
}

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
