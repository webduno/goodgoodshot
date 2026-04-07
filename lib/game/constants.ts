import { PREDETERMINED_VEHICLES } from "@/components/playerVehicleConfig";
import * as THREE from "three";

export const BLOCK_SIZE = 1;
/** Rear click target on the vehicle; local −Z is behind the default 1×1×1 hull. */
export const SHOOT_TRIGGER_CUBE_SIZE = 0.2;
/**
 * Min/max distance from spawn to goal along +Z (new random value after each shot).
 * Independent of launch strength — do not tune one from the other.
 */
export const GOAL_Z_MIN = 70;
export const GOAL_Z_MAX = 350;
/** Random sideways offset for the green goal (grid units). */
export const GOAL_X_MIN = -26;
export const GOAL_X_MAX = 26;

/**
 * Side pads off the Manhattan lane (grid units from centerline at each sample cell).
 * Paired with `appendFlankIslandsAlongLane` in `lib/game/islands.ts`.
 */
export const FLANK_ISLAND_OFFSET_X = 12;

/** Horizontal aim: radians from +Z toward +X (left button increases yaw, right decreases). */
export const AIM_YAW_STEP_RAD = THREE.MathUtils.degToRad(5);
export const AIM_YAW_QUARTER_TURN_RAD = THREE.MathUtils.degToRad(90);
/** Aim pad: local yaw is ± this from the current side center (90° total arc: −45° … +45°). */
export const AIM_PAD_LOCAL_YAW_HALF_RAD = THREE.MathUtils.degToRad(45);

/** Vertical aim: offset from `vehicle.launchAngleRad` (clamped to ± this value). */
export const AIM_PITCH_MAX_RAD = THREE.MathUtils.degToRad(15);
/** Nudge per tap (matches horizontal aim step). */
export const AIM_PITCH_STEP_RAD = AIM_YAW_STEP_RAD;

export const SPHERE_RADIUS = 0.2;

/** Top of the green field mesh (`InitialFieldGround`); aligns with block bottom at y = 0. */
export const TURF_TOP_Y = -BLOCK_SIZE / 2;
/** Sphere center Y when the ball rests on the turf (bottom of sphere at `TURF_TOP_Y`). */
export const FLOOR_CONTACT_CENTER_Y = TURF_TOP_Y + SPHERE_RADIUS;
/** End ground roll when horizontal speed drops below this (world units/s). */
export const ROLL_STOP_SPEED = 0.04;

/** Random pond footprint half-extents (world units); physics + mesh use the same values. */
export const POND_HALF_X_MIN = 3;
export const POND_HALF_X_MAX = 21;
export const POND_HALF_Z_MIN = 4;
export const POND_HALF_Z_MAX = 24;

export const PLAYER_GROUND_HALF = BLOCK_SIZE / 2;

/** Goal pyramid AABB half-extents: 2×2 blocks on XZ, 2 blocks tall (center on `goalCenter` + `GOAL_PYRAMID_Y_OFFSET` on Y). */
export const GOAL_HALF_XZ = BLOCK_SIZE;
export const GOAL_HALF_Y = BLOCK_SIZE;
/** Y from lane `goalCenter[1]` to pyramid mesh group origin (cylinder center; base on `TURF_TOP_Y`). */
export const GOAL_PYRAMID_Y_OFFSET = TURF_TOP_Y + GOAL_HALF_Y;

/** Penalty pond water tint (mid sky blue; matches Frutiger Aero palette). */
export const BG = "#78d4ff";
/** Page chrome + scene wrapper — same stops as `app/page.tsx` / `globals.css` body. */
export const SKY_GRADIENT_CSS =
  "linear-gradient(180deg, #d4f1ff 0%, #7dd3fc 38%, #00aeef 72%, #0072bc 100%)";
/** Fog color — mid band so distant meshes blend with the gradient sky. */
export const FOG_SKY = "#7dd3fc";
/** Linear fog (world units): ramp from `FOG_NEAR` to sky color by `FOG_FAR` — distant play barely visible. */
export const FOG_NEAR = 70;
export const FOG_FAR = 175;

/**
 * Penalty hazard: wide/long on XZ (pond). Physics uses block height on Y so the ball
 * registers like the goal; the mesh is a thin slab barely above the turf plane.
 */
/** Visual half-thickness on Y; mesh extends downward from `POND_VIS_TOP_Y` — does not move the surface. */
export const POND_HALF_Y_VIS = 0.9;
/** Lift bottom slightly above the grass plane to avoid z-fighting / clipping with the field. */
export const POND_TURF_GAP = 0;
/** Y of the water surface (top of pond) above `-BLOCK_SIZE/2 + POND_TURF_GAP`; independent of `POND_HALF_Y_VIS`. */
export const POND_SURFACE_LIFT = 0.056;
export const POND_VIS_TOP_Y = -BLOCK_SIZE / 2 + POND_TURF_GAP + POND_SURFACE_LIFT;
export const POND_VIS_CENTER_Y = POND_VIS_TOP_Y - POND_HALF_Y_VIS;
export const POND_VIS_BOTTOM_Y = POND_VIS_TOP_Y - 2 * POND_HALF_Y_VIS;
/** Lower the second pond mesh slightly so two water slabs do not z-fight when overlapping in XZ. */
export const POND_SECOND_SURFACE_DROP = 0.028;

/** Tee marker at hole start (origin): putting green, just above pond surface height. */
export const GOAL_GREEN = "#4bcd5f";
/** End-of-hole goal block (hit target) — sphere / accent. */
export const GOAL_BLOCK_COLOR = "#c62828";
/** Great Pyramid of Giza–style casing limestone (warm sandstone). */
export const GOAL_PYRAMID_COLOR = "#c9a66b";
export const TEE_GAP_ABOVE_WATER = 0.02;
export const TEE_PAD_HALF_Y = 0.035;

/** Yellow lane markers between spawn and green goal (progress cues). */
export const LANE_MARKER_COUNT_PER_SIDE = 5;
/** Distance from lane center (X) — ten unit blocks to each side. */
export const LANE_MARKER_SIDE_OFFSET_X = 10 * BLOCK_SIZE;
export const LANE_MARKER_COLOR = "#fce62e";

/** Small cubes at the four bottom corners of the spawn block (vehicle wheels). */
export const VEHICLE_CORNER_BLOCK_SIZE = 0.38;
/** Inset from vehicle side + wheel half so inner wheel face clears the body (reduces z-fighting). */
export const VEHICLE_WHEEL_OUTWARD = 0.08;
/** Lift wheel bottoms slightly above the green plane so they are not drawn under it. */
export const VEHICLE_WHEEL_FLOOR_Y_EPS = 0.02;

/** Wheel outer radius from spawn center (body half + arm + wheel half). */
export const VEHICLE_FOOTPRINT_HALF_XZ =
  BLOCK_SIZE / 2 +
  VEHICLE_WHEEL_OUTWARD +
  VEHICLE_CORNER_BLOCK_SIZE / 2;
/** Full player span on XZ ≈ 2× this; tee width (X) is slightly more than 4× footprint for comfort. */
export const TEE_PAD_HALF_X = VEHICLE_FOOTPRINT_HALF_XZ * 4.6;
export const TEE_PAD_HALF_Z = VEHICLE_FOOTPRINT_HALF_XZ * 4;
/**
 * Extra pad length toward −Z only (`SpawnTeePad`), so the green extends under `TeeHoleSign`
 * (sign sits just past the nominal back edge at `−TEE_PAD_HALF_Z`).
 */
export const TEE_PAD_EXTEND_BACK_Z = 0.55;
export const TEE_PAD_CENTER_Y = TEE_PAD_HALF_Y;

/** Prism length for the weakest predetermined vehicle; stronger builds scale up linearly. */
export const AIM_PRISM_LENGTH = 0.85;
export const AIM_PRISM_RADIUS = 0.14;
export const AIM_PRISM_COLOR = "#f0fcff";

export const MIN_PREDETERMINED_STRENGTH_PER_BASE_CLICK = Math.min(
  ...PREDETERMINED_VEHICLES.map((v) => v.strengthPerBaseClick)
);

/** Ground plane for the initial field: covers goal sideways range + flank pads + margin. */
export const FIELD_PLANE_HALF_WIDTH_X = Math.max(
  (GOAL_X_MAX + FLANK_ISLAND_OFFSET_X + 5 * BLOCK_SIZE) / 2,
  LANE_MARKER_SIDE_OFFSET_X / 2 + BLOCK_SIZE * 1.5
);
export const FIELD_PLANE_Z_BEFORE_SPAWN = 4 * BLOCK_SIZE;
export const FIELD_PLANE_Z_PAST_GOAL = 12 * BLOCK_SIZE;
export const FIELD_GROUND_MUTED_GREEN = "#7ede92";
/** Island turf top for desert biome (fairway slabs). */
export const FIELD_GROUND_DESERT_SAND = "#d4a574";
/** Inverted pyramid under desert fairway — warm sandstone, distinct from sand top. */
export const FIELD_ISLAND_FOUNDATION_DESERT = "#b8956a";
/** Minimap underside strip only — darker than `FIELD_ISLAND_FOUNDATION_DESERT` so it reads vs sand turf. */
export const FIELD_MINIMAP_DESERT_FOUNDATION = "#8a5c3a";
/** Inverted pyramid under plain fairway — neutral grey stone. */
export const FIELD_ISLAND_FOUNDATION_PLAIN = "#6b6f76";
/** Dark pine fairway (forest biome). */
export const FIELD_GROUND_FOREST = "#2d6b3f";
/** Forest island foundation — rich soil. */
export const FIELD_ISLAND_FOUNDATION_FOREST = "#5c4033";
/** Packed snow / frost fairway (snow biome). */
export const FIELD_GROUND_SNOW = "#e8f2fa";
/** Snow biome foundation — cold rock / ice (minimap / shared `islandColorsForBiome`). */
export const FIELD_ISLAND_FOUNDATION_SNOW = "#7a95a8";
/**
 * Snow inverted-pyramid mesh only — lighter than `FIELD_ISLAND_FOUNDATION_SNOW` so directional
 * light + shadow on steep faces does not read near-black.
 */
export const FIELD_ISLAND_FOUNDATION_SNOW_MESH = "#aabdcb";

/** Starting charges per power-up type (Strength, No bounce, No wind each have their own pool). */
export const INITIAL_POWERUP_CHARGES = 2;

/** Power-up slots (order is fixed in the HUD). */
export const POWERUP_SLOTS = [
  { id: "strength", name: "Strength", implemented: true },
  { id: "noBounce", name: "No bounce", implemented: true },
  { id: "nowind", name: "No wind", implemented: true },
  {
    id: "guideline",
    name: "Guideline",
    implemented: true,
  },
  { id: "time", name: "Time", implemented: false },
  { id: "magnet", name: "Magnet", implemented: false },
  { id: "lucky", name: "Lucky", implemented: false },
] as const;

/**
 * Gameplay orbit camera offset from spawn (behind the tank along −Z; look toward +Z / sun).
 */
export const CAMERA_OFFSET_FROM_SPAWN: readonly [number, number, number] = [
  -1.38, 1.78, -4.45,
];
/**
 * First-frame camera matches gameplay (wider start — no intro zoom-in). Tank hull faces +Z
 * (shot / eyes); same hemisphere as gameplay — behind the hull, view toward sun (+Z).
 */
export const INTRO_CAMERA_OFFSET_FROM_SPAWN = CAMERA_OFFSET_FROM_SPAWN;
/**
 * Fixed world offset from the ball while follow-ball mode is on: slightly above and behind
 * (−Z, spawn side) so the shot stays in view without a steep top-down; orbit is disabled.
 */
export const FOLLOW_BALL_CAMERA_OFFSET: readonly [number, number, number] = [
  -0.85, 4.2, -8.2,
];
/** Seconds for intro tween when intro and gameplay offsets differ; 0 skips the wait. */
export const INTRO_CAMERA_DURATION_SEC = 0;
/** Orbit pivot Y: one block above the spawn block center. */
export const ORBIT_TARGET_Y_OFFSET = BLOCK_SIZE;
/**
 * Near/far clip: far must exceed longest sight lines (long holes, orbited camera) or
 * meshes clip by distance regardless of height. Logarithmic depth buffer keeps usable
 * precision for nearly coplanar ground / tee / hazard slabs when far is large.
 */
export const CAMERA_NEAR = 0.45;
export const CAMERA_FAR = 6000;

/** Seconds for linear camera + spawn move when `gameSpawn` jumps (orbit disabled until done). */
export const TELEPORT_DURATION_SEC = 0.5;

/** Mid Z for goal corridor; used by static goal-area light (does not follow rolling goal X/Z). */
export const MID_GOAL_Z = (GOAL_Z_MIN + GOAL_Z_MAX) / 2;

/**
 * Distant sky sun (+Z past any hole). Y clears `SkyClouds` slabs; X is lane center (spawn → goal).
 * Not a scene light — billboard sprite only (`SkySun`).
 */
export const SUN_MARGIN_PAST_MAX_GOAL_Z = 80;
export const SUN_WORLD_Z = GOAL_Z_MAX + SUN_MARGIN_PAST_MAX_GOAL_Z;
export const SUN_WORLD_X = 0;
/** Low in the sky toward the fog/horizon band (far +Z billboard). */
export const SUN_WORLD_Y = 12;
/** World-units width/height for the billboard (always faces camera). */
export const SUN_BILLBOARD_SIZE = 56;
