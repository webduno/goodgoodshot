import { PREDETERMINED_VEHICLES } from "@/components/playerVehicleConfig";
import * as THREE from "three";

export const BLOCK_SIZE = 1;
/**
 * Min/max distance from spawn to goal along +Z (new random value after each shot).
 * Independent of launch strength — do not tune one from the other.
 */
export const GOAL_Z_MIN = 20;
export const GOAL_Z_MAX = 200;
/** Random sideways offset for the green goal (grid units). */
export const GOAL_X_MIN = -18;
export const GOAL_X_MAX = 18;

/** Horizontal aim: radians from +Z toward +X (left button increases yaw, right decreases). */
export const AIM_YAW_STEP_RAD = THREE.MathUtils.degToRad(5);
export const AIM_YAW_QUARTER_TURN_RAD = THREE.MathUtils.degToRad(90);

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

/** Goal block / hazard box AABB (same as the mesh: center + half extents). */
export const GOAL_HALF = BLOCK_SIZE / 2;

/** Clear color + page chrome — Frutiger Aero sky; penalty ponds use the same tint. */
export const BG = "#78d4ff";
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
export const GOAL_GREEN = "#39b54a";
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
/** Full player span on XZ ≈ 2× this; tee is 4× that width → half-extent = 4× footprint half. */
export const TEE_PAD_HALF_X = VEHICLE_FOOTPRINT_HALF_XZ * 4;
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

/** Ground plane for the initial field: wider than yellow lane span, longer than spawn→goal. */
export const FIELD_PLANE_HALF_WIDTH_X =
  2 * (LANE_MARKER_SIDE_OFFSET_X / 2 + BLOCK_SIZE * 1.5);
export const FIELD_PLANE_Z_BEFORE_SPAWN = 4 * BLOCK_SIZE;
export const FIELD_PLANE_Z_PAST_GOAL = 12 * BLOCK_SIZE;
export const FIELD_GROUND_MUTED_GREEN = "#3a9d4a";

/** Starting charges per power-up type (Strength, No bounce, No wind each have their own pool). */
export const INITIAL_POWERUP_CHARGES = 2;

/** Power-up slots (order is fixed in the HUD). */
export const POWERUP_SLOTS = [
  { id: "strength", name: "Strength", implemented: true },
  { id: "noBounce", name: "No bounce", implemented: true },
  { id: "nowind", name: "No wind", implemented: true },
  { id: "time", name: "Time", implemented: false },
  { id: "magnet", name: "Magnet", implemented: false },
  { id: "lucky", name: "Lucky", implemented: false },
] as const;

/**
 * First-frame camera offset from spawn (medium close, face visible). Tank hull faces +Z
 * (shot / eyes); use +Z here so the camera sits in front of the face, not behind.
 */
export const INTRO_CAMERA_OFFSET_FROM_SPAWN: readonly [number, number, number] = [
  0.95, 1.22, 3.1,
];
/**
 * Gameplay orbit camera offset from spawn (further out in front of the tank; goal stays down +Z).
 */
export const CAMERA_OFFSET_FROM_SPAWN: readonly [number, number, number] = [
  1.38, 1.78, 4.45,
];
/** Seconds for intro zoom-out from `INTRO_CAMERA_OFFSET_FROM_SPAWN` to gameplay offset. */
export const INTRO_CAMERA_DURATION_SEC = 2.4;
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
