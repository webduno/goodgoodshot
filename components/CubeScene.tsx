"use client";

import {
  goldChipButtonStyle,
  goldIconButtonStyle,
  goldPillButtonStyle,
  hudAimPanelStrip,
  hudBottomPanel,
  hudBottomReadoutLabel,
  hudBottomReadoutValue,
  hudColors,
  hudFont,
  hudMiniPanel,
  helpModalCard,
  modalBackdrop,
  modalCard,
  powerupSlotStyle,
  progressFillStyle,
  progressTrack,
} from "@/components/gameHudStyles";
import { ToastNotif } from "@/components/ToastNotif";
import {
  DEFAULT_V_ID,
  PREDETERMINED_VEHICLES,
  launchStrengthFromClicks,
  resolveVehicleFromUrlParam,
  rgbTupleToCss,
  vehicleChargeMs,
  vehicleShotCooldownMs,
  type PlayerVehicleConfig,
} from "@/components/playerVehicleConfig";
import { useSearchParams } from "next/navigation";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { RootState, ThreeEvent } from "@react-three/fiber";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { MutableRefObject, ReactNode } from "react";
import type { CSSProperties } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type Vec3 = readonly [number, number, number];

const BLOCK_SIZE = 1;
/**
 * Min/max distance from spawn to goal along +Z (new random value after each shot).
 * Independent of launch strength — do not tune one from the other.
 */
const GOAL_Z_MIN = 20;
const GOAL_Z_MAX = 200;
/** Random sideways offset for the green goal (grid units). */
const GOAL_X_MIN = -8;
const GOAL_X_MAX = 8;

/** Horizontal aim: radians from +Z toward +X (left button increases yaw, right decreases). */
const AIM_YAW_STEP_RAD = THREE.MathUtils.degToRad(5);
const AIM_YAW_QUARTER_TURN_RAD = THREE.MathUtils.degToRad(90);

/** Keep yaw in [-π, π] (~-180° … +180°) after stepping. */
function wrapYawRad(a: number): number {
  return THREE.MathUtils.euclideanModulo(a + Math.PI, Math.PI * 2) - Math.PI;
}

const SPHERE_RADIUS = 0.2;

function spawnTopYFromBlockCenterY(blockCenterY: number): number {
  return blockCenterY + BLOCK_SIZE / 2 + SPHERE_RADIUS;
}

/** Top of the green field mesh (`InitialFieldGround`); aligns with block bottom at y = 0. */
const TURF_TOP_Y = -BLOCK_SIZE / 2;
/** Sphere center Y when the ball rests on the turf (bottom of sphere at `TURF_TOP_Y`). */
const FLOOR_CONTACT_CENTER_Y = TURF_TOP_Y + SPHERE_RADIUS;
/** End ground roll when horizontal speed drops below this (world units/s). */
const ROLL_STOP_SPEED = 0.04;

function snapBlockCenterToGrid(v: readonly [number, number, number]): Vec3 {
  return [Math.round(v[0]), Math.round(v[1]), Math.round(v[2])];
}

function randomIntInclusive(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Random pond footprint half-extents (world units); physics + mesh use the same values. */
const POND_HALF_X_MIN = 3;
const POND_HALF_X_MAX = 21;
const POND_HALF_Z_MIN = 4;
const POND_HALF_Z_MAX = 24;

const PLAYER_GROUND_HALF = BLOCK_SIZE / 2;

function rectsOverlapXZ(
  ax: number,
  az: number,
  ahx: number,
  ahz: number,
  bx: number,
  bz: number,
  bhx: number,
  bhz: number
): boolean {
  return (
    Math.abs(ax - bx) <= ahx + bhx && Math.abs(az - bz) <= ahz + bhz
  );
}

function pondOverlapsPlayerCell(
  pondCx: number,
  pondCz: number,
  halfX: number,
  halfZ: number,
  spawnX: number,
  spawnZ: number
): boolean {
  return rectsOverlapXZ(
    pondCx,
    pondCz,
    halfX,
    halfZ,
    spawnX,
    spawnZ,
    PLAYER_GROUND_HALF,
    PLAYER_GROUND_HALF
  );
}

function pondOverlapsGoalBlock(
  pondCx: number,
  pondCz: number,
  halfX: number,
  halfZ: number,
  goalX: number,
  goalZ: number
): boolean {
  const gh = BLOCK_SIZE / 2;
  return rectsOverlapXZ(
    pondCx,
    pondCz,
    halfX,
    halfZ,
    goalX,
    goalZ,
    gh,
    gh
  );
}

function pondsOverlapEachOther(
  ax: number,
  az: number,
  ahx: number,
  ahz: number,
  bx: number,
  bz: number,
  bhx: number,
  bhz: number
): boolean {
  return rectsOverlapXZ(ax, az, ahx, ahz, bx, bz, bhx, bhz);
}

type PondSpec = {
  worldX: number;
  worldZ: number;
  halfX: number;
  halfZ: number;
  /** Second pond is drawn slightly lower so coplanar water surfaces do not z-fight. */
  surfaceLayer: 0 | 1;
};

function validPondPosition(
  x: number,
  z: number,
  halfX: number,
  halfZ: number,
  spawnX: number,
  spawnZ: number,
  goalX: number,
  goalZ: number,
  placed: readonly PondSpec[]
): boolean {
  if (pondOverlapsGoalBlock(x, z, halfX, halfZ, goalX, goalZ)) return false;
  if (pondOverlapsPlayerCell(x, z, halfX, halfZ, spawnX, spawnZ)) return false;
  for (const p of placed) {
    if (
      pondsOverlapEachOther(
        x,
        z,
        halfX,
        halfZ,
        p.worldX,
        p.worldZ,
        p.halfX,
        p.halfZ
      )
    ) {
      return false;
    }
  }
  return true;
}

function tryPlacePond(
  halfX: number,
  halfZ: number,
  spawnX: number,
  spawnZ: number,
  goalX: number,
  goalZ: number,
  placed: readonly PondSpec[]
): { x: number; z: number } | null {
  for (let attempt = 0; attempt < 200; attempt++) {
    const o = randomObstacleBetween(spawnZ, goalZ);
    if (
      validPondPosition(o.x, o.z, halfX, halfZ, spawnX, spawnZ, goalX, goalZ, placed)
    ) {
      return o;
    }
  }
  const tMin = Math.min(spawnZ, goalZ);
  const tMax = Math.max(spawnZ, goalZ);
  const lo = Math.round(tMin) + 4;
  const hi = Math.round(tMax) - 4;
  const tryZList: number[] =
    lo > hi
      ? [Math.round((spawnZ + goalZ) / 2)]
      : Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  for (const zz of tryZList) {
    for (let x = GOAL_X_MIN; x <= GOAL_X_MAX; x++) {
      if (
        validPondPosition(x, zz, halfX, halfZ, spawnX, spawnZ, goalX, goalZ, placed)
      ) {
        return { x, z: zz };
      }
    }
  }
  return null;
}

/** One or two ponds with random sizes; rerolled with goal on hole-out. */
function pickPondsLayout(
  spawnX: number,
  spawnZ: number,
  goalX: number,
  goalZ: number
): PondSpec[] {
  const count = randomIntInclusive(1, 2);
  const out: PondSpec[] = [];
  for (let i = 0; i < count; i++) {
    let hx = randomIntInclusive(POND_HALF_X_MIN, POND_HALF_X_MAX);
    let hz = randomIntInclusive(POND_HALF_Z_MIN, POND_HALF_Z_MAX);
    let pos = tryPlacePond(hx, hz, spawnX, spawnZ, goalX, goalZ, out);
    let tries = 0;
    while (!pos && tries < 28) {
      hx = randomIntInclusive(POND_HALF_X_MIN, POND_HALF_X_MAX);
      hz = randomIntInclusive(POND_HALF_Z_MIN, POND_HALF_Z_MAX);
      pos = tryPlacePond(hx, hz, spawnX, spawnZ, goalX, goalZ, out);
      tries++;
    }
    if (!pos) break;
    out.push({
      worldX: pos.x,
      worldZ: pos.z,
      halfX: hx,
      halfZ: hz,
      surfaceLayer: i === 0 ? 0 : 1,
    });
  }
  if (out.length === 0) {
    for (const hx of [4, 5, 3, 6]) {
      for (const hz of [5, 6, 4, 7]) {
        const pos = tryPlacePond(hx, hz, spawnX, spawnZ, goalX, goalZ, []);
        if (pos) {
          out.push({
            worldX: pos.x,
            worldZ: pos.z,
            halfX: hx,
            halfZ: hz,
            surfaceLayer: 0,
          });
          return out;
        }
      }
    }
  }
  return out;
}

type GameState = {
  spawnCenter: Vec3;
  /** World-space Z of green goal center; unchanged on miss, rerolled only on hit. */
  goalWorldZ: number;
  /** World-space X of green goal center; unchanged on miss, rerolled only on hit. */
  goalWorldX: number;
  /** Penalty ponds (0–2); rerolled with goal on hole-out. */
  ponds: readonly PondSpec[];
};

type GameAction = {
  type: "PROJECTILE_END";
  outcome: "hit" | "miss" | "penalty";
  landing?: Vec3;
  /** Spawn position before the shot that hit the penalty (snapped). */
  revertSpawn?: Vec3;
};

/** Hazard placement along the lane between spawn and goal (grid Z). */
function randomObstacleBetween(
  spawnZ: number,
  goalZ: number
): { x: number; z: number } {
  const tMin = Math.min(spawnZ, goalZ);
  const tMax = Math.max(spawnZ, goalZ);
  const lo = Math.round(tMin) + 4;
  const hi = Math.round(tMax) - 4;
  if (lo > hi) {
    const mid = Math.round((spawnZ + goalZ) / 2);
    return {
      x: randomIntInclusive(GOAL_X_MIN, GOAL_X_MAX),
      z: mid,
    };
  }
  return {
    x: randomIntInclusive(GOAL_X_MIN, GOAL_X_MAX),
    z: randomIntInclusive(lo, hi),
  };
}

function createInitialGameState(): GameState {
  const goalWorldZ = randomIntInclusive(GOAL_Z_MIN, GOAL_Z_MAX);
  const goalWorldX = randomIntInclusive(GOAL_X_MIN, GOAL_X_MAX);
  const spawnX = 0;
  const spawnZ = 0;
  const ponds = pickPondsLayout(spawnX, spawnZ, goalWorldX, goalWorldZ);
  return {
    spawnCenter: [0, 0, 0],
    goalWorldZ,
    goalWorldX,
    ponds,
  };
}

/** Yellow lane markers and goal stay here in world space; only the spawn block uses `spawnCenter`. */
const INITIAL_LANE_ORIGIN: Vec3 = [0, 0, 0];

function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type !== "PROJECTILE_END") return state;

  const prev = state.spawnCenter;
  let next: Vec3;
  let nextGoalWorldZ = state.goalWorldZ;
  let nextGoalWorldX = state.goalWorldX;
  let nextPonds = state.ponds;

  if (action.outcome === "hit") {
    next = snapBlockCenterToGrid([
      prev[0],
      prev[1],
      state.goalWorldZ,
    ]);
    nextGoalWorldZ = next[2] + randomIntInclusive(GOAL_Z_MIN, GOAL_Z_MAX);
    nextGoalWorldX = randomIntInclusive(GOAL_X_MIN, GOAL_X_MAX);
    nextPonds = pickPondsLayout(
      next[0],
      next[2],
      nextGoalWorldX,
      nextGoalWorldZ
    );
  } else if (action.outcome === "penalty" && action.revertSpawn) {
    next = snapBlockCenterToGrid(action.revertSpawn);
  } else if (action.landing) {
    next = snapBlockCenterToGrid(action.landing);
  } else {
    next = prev;
  }

  return {
    ...state,
    spawnCenter: next,
    goalWorldZ: nextGoalWorldZ,
    goalWorldX: nextGoalWorldX,
    ponds: nextPonds,
  };
}

/** Goal block / hazard box AABB (same as the mesh: center + half extents). */
const GOAL_HALF = BLOCK_SIZE / 2;

/** Clear color + page chrome — Frutiger Aero sky; penalty ponds use the same tint. */
const BG = "#78d4ff";

/**
 * Penalty hazard: wide/long on XZ (pond). Physics uses block height on Y so the ball
 * registers like the goal; the mesh is a thin slab barely above the turf plane.
 */
/** Visual half-thickness on Y; mesh extends downward from `POND_VIS_TOP_Y` — does not move the surface. */
const POND_HALF_Y_VIS = 0.9;
/** Lift bottom slightly above the grass plane to avoid z-fighting / clipping with the field. */
const POND_TURF_GAP = 0;
/** Y of the water surface (top of pond) above `-BLOCK_SIZE/2 + POND_TURF_GAP`; independent of `POND_HALF_Y_VIS`. */
const POND_SURFACE_LIFT = 0.056;
const POND_VIS_TOP_Y = -BLOCK_SIZE / 2 + POND_TURF_GAP + POND_SURFACE_LIFT;
const POND_VIS_CENTER_Y = POND_VIS_TOP_Y - POND_HALF_Y_VIS;
const POND_VIS_BOTTOM_Y = POND_VIS_TOP_Y - 2 * POND_HALF_Y_VIS;
/** Lower the second pond mesh slightly so two water slabs do not z-fight when overlapping in XZ. */
const POND_SECOND_SURFACE_DROP = 0.028;

/** Tee marker at hole start (origin): putting green, just above pond surface height. */
const GOAL_GREEN = "#39b54a";
/** End-of-hole goal block (hit target). */
const GOAL_BLOCK_COLOR = "#c62828";
const TEE_GAP_ABOVE_WATER = 0.02;
const TEE_PAD_HALF_Y = 0.035;

/** Yellow lane markers between spawn and green goal (progress cues). */
const LANE_MARKER_COUNT_PER_SIDE = 5;
/** Distance from lane center (X) — ten unit blocks to each side. */
const LANE_MARKER_SIDE_OFFSET_X = 10 * BLOCK_SIZE;
const LANE_MARKER_COLOR = "#fce62e";

/** Small cubes at the four bottom corners of the spawn block (vehicle wheels). */
const VEHICLE_CORNER_BLOCK_SIZE = 0.38;
/** Inset from vehicle side + wheel half so inner wheel face clears the body (reduces z-fighting). */
const VEHICLE_WHEEL_OUTWARD = 0.08;
/** Lift wheel bottoms slightly above the green plane so they are not drawn under it. */
const VEHICLE_WHEEL_FLOOR_Y_EPS = 0.02;

/** Wheel outer radius from spawn center (body half + arm + wheel half). */
const VEHICLE_FOOTPRINT_HALF_XZ =
  BLOCK_SIZE / 2 +
  VEHICLE_WHEEL_OUTWARD +
  VEHICLE_CORNER_BLOCK_SIZE / 2;
/** Full player span on XZ ≈ 2× this; tee is 4× that width → half-extent = 4× footprint half. */
const TEE_PAD_HALF_X = VEHICLE_FOOTPRINT_HALF_XZ * 4;
const TEE_PAD_HALF_Z = VEHICLE_FOOTPRINT_HALF_XZ * 4;
const TEE_PAD_CENTER_Y =
  TEE_PAD_HALF_Y;

/** Prism length for the weakest predetermined vehicle; stronger builds scale up linearly. */
const AIM_PRISM_LENGTH = 0.85;
const AIM_PRISM_RADIUS = 0.14;
const AIM_PRISM_COLOR = "#f0fcff";

const MIN_PREDETERMINED_STRENGTH_PER_BASE_CLICK = Math.min(
  ...PREDETERMINED_VEHICLES.map((v) => v.strengthPerBaseClick)
);

function aimPrismLengthForStrength(strengthPerBaseClick: number): number {
  return (
    AIM_PRISM_LENGTH *
    (strengthPerBaseClick / MIN_PREDETERMINED_STRENGTH_PER_BASE_CLICK)
  );
}

/** Ground plane for the initial field: wider than yellow lane span, longer than spawn→goal. */
const FIELD_PLANE_HALF_WIDTH_X =
  2 * (LANE_MARKER_SIDE_OFFSET_X / 2 + BLOCK_SIZE * 1.5);
const FIELD_PLANE_Z_BEFORE_SPAWN = 4 * BLOCK_SIZE;
const FIELD_PLANE_Z_PAST_GOAL = 12 * BLOCK_SIZE;
const FIELD_GROUND_MUTED_GREEN = "#3a9d4a";

function sphereIntersectsAabb(
  px: number,
  py: number,
  pz: number,
  radius: number,
  center: Vec3,
  halfX: number,
  halfY: number,
  halfZ: number
): boolean {
  const cx = center[0];
  const cy = center[1];
  const cz = center[2];
  const minX = cx - halfX;
  const maxX = cx + halfX;
  const minY = cy - halfY;
  const maxY = cy + halfY;
  const minZ = cz - halfZ;
  const maxZ = cz + halfZ;

  const qx = THREE.MathUtils.clamp(px, minX, maxX);
  const qy = THREE.MathUtils.clamp(py, minY, maxY);
  const qz = THREE.MathUtils.clamp(pz, minZ, maxZ);
  const dx = px - qx;
  const dy = py - qy;
  const dz = pz - qz;
  return dx * dx + dy * dy + dz * dz < radius * radius;
}

function sphereIntersectsGoalBox(
  px: number,
  py: number,
  pz: number,
  radius: number,
  goalCenter: Vec3
): boolean {
  return sphereIntersectsAabb(
    px,
    py,
    pz,
    radius,
    goalCenter,
    GOAL_HALF,
    GOAL_HALF,
    GOAL_HALF
  );
}

/** Starting inventory; each strength power-up use doubles launch for that shot (stacks: 2×, 4×, …). */
const INITIAL_POWERUP_CHARGES = 2;

/** Five power-up slots (only the first is implemented; order is fixed in the HUD). */
const POWERUP_SLOTS = [
  { id: "strength", name: "Strength", implemented: true },
  { id: "precision", name: "Precision", implemented: false },
  { id: "time", name: "Time", implemented: false },
  { id: "magnet", name: "Magnet", implemented: false },
  { id: "lucky", name: "Lucky", implemented: false },
] as const;

type PowerupSlotId = (typeof POWERUP_SLOTS)[number]["id"];

/** Inline SVG per slot (no external assets). */
function PowerupHudIcon({
  slotId,
  color,
  size = 14,
}: {
  slotId: PowerupSlotId;
  color: string;
  size?: number;
}) {
  const s = size;
  const box = {
    width: s,
    height: s,
    viewBox: "0 0 24 24",
    "aria-hidden": true as const,
    style: { display: "block" as const, flexShrink: 0, color },
  };
  switch (slotId) {
    case "strength":
      return (
        <svg {...box}>
          <path
            fill="currentColor"
            d="M7 2v11h3v9l7-12h-4l4-8H7z"
          />
        </svg>
      );
    case "precision":
      return (
        <svg {...box} fill="none">
          <circle
            cx="12"
            cy="12"
            r="4"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            d="M12 5v2M12 17v2M5 12h2M17 12h2"
          />
        </svg>
      );
    case "time":
      return (
        <svg {...box}>
          <path
            fill="currentColor"
            d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"
          />
        </svg>
      );
    case "magnet":
      return (
        <svg {...box} fill="none">
          <path
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            d="M7 7v6a5 5 0 0 0 10 0V7"
          />
          <path
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            d="M9 7V5a1 1 0 0 1 1-1h0a1 1 0 0 1 1 1v2M13 7V5a1 1 0 0 1 1-1h0a1 1 0 0 1 1 1v2"
          />
        </svg>
      );
    case "lucky":
      return (
        <svg {...box}>
          <path
            fill="currentColor"
            d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7L12 17l-6.3 4 2.3-7-6-4.6h7.6z"
          />
        </svg>
      );
    default:
      return null;
  }
}

type Projectile = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Remaining rebounds allowed after current ground contact resolves. */
  bouncesRemaining: number;
  /** Sliding/rolling on the floor with horizontal friction (no gravity). */
  rolling: boolean;
};

/**
 * Camera offset from spawn block center (lane stays to +X so the goal stays visible).
 */
const CAMERA_OFFSET_FROM_SPAWN: Vec3 = [0.95, 1.22, -3.1];
/** Orbit pivot Y: one block above the spawn block center. */
const ORBIT_TARGET_Y_OFFSET = BLOCK_SIZE;
/**
 * Near/far clip: far must exceed longest sight lines (long holes, orbited camera) or
 * meshes clip by distance regardless of height. Logarithmic depth buffer keeps usable
 * precision for nearly coplanar ground / tee / hazard slabs when far is large.
 */
const CAMERA_NEAR = 0.45;
const CAMERA_FAR = 6000;
function onCanvasCreated({ camera, gl, scene }: RootState) {
  scene.background = new THREE.Color(BG);
  gl.setClearColor(new THREE.Color(BG), 1);

  if (camera instanceof THREE.PerspectiveCamera) {
    camera.fov = 72;
    camera.near = CAMERA_NEAR;
    camera.far = CAMERA_FAR;
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld();
}

/** Seconds for linear camera + spawn move when `gameSpawn` jumps (orbit disabled until done). */
const TELEPORT_DURATION_SEC = 0.5;

function sameVec3(a: Vec3, b: Vec3): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

const VisualSpawnContext = createContext<MutableRefObject<THREE.Vector3> | null>(
  null
);

function SpawnVisualGroup({ children }: { children: ReactNode }) {
  const visualRef = useContext(VisualSpawnContext);
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = groupRef.current;
    if (!g || !visualRef) return;
    const v = visualRef.current;
    g.position.set(v.x, v.y, v.z);
  });
  return <group ref={groupRef}>{children}</group>;
}

function TeleportOrbitRig({
  gameSpawn,
  children,
}: {
  gameSpawn: Vec3;
  children: ReactNode;
}) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  const visualRef = useRef(
    new THREE.Vector3(gameSpawn[0], gameSpawn[1], gameSpawn[2])
  );
  const fromRef = useRef(new THREE.Vector3());
  const toRef = useRef(new THREE.Vector3());
  const progressRef = useRef(0);
  const transitioningRef = useRef(false);
  const prevGameRef = useRef<Vec3 | null>(null);
  const camStartRef = useRef(new THREE.Vector3());
  const tgtStartRef = useRef(new THREE.Vector3());
  const deltaVRef = useRef(new THREE.Vector3());

  useLayoutEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 2.1;
    controls.maxDistance = 120;
    controls.enablePan = false;
    controlsRef.current = controls;
    return () => {
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl]);

  useLayoutEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const prev = prevGameRef.current;
    if (prev === null) {
      const sx = gameSpawn[0];
      const sy = gameSpawn[1];
      const sz = gameSpawn[2];
      camera.position.set(
        sx + CAMERA_OFFSET_FROM_SPAWN[0],
        sy + CAMERA_OFFSET_FROM_SPAWN[1],
        sz + CAMERA_OFFSET_FROM_SPAWN[2]
      );
      controls.target.set(sx, sy + ORBIT_TARGET_Y_OFFSET, sz);
      visualRef.current.set(sx, sy, sz);
      controls.update();
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      prevGameRef.current = [sx, sy, sz];
      return;
    }
    if (sameVec3(prev, gameSpawn)) return;
    fromRef.current.copy(visualRef.current);
    toRef.current.set(gameSpawn[0], gameSpawn[1], gameSpawn[2]);
    progressRef.current = 0;
    transitioningRef.current = true;
    camStartRef.current.copy(camera.position);
    tgtStartRef.current.copy(controls.target);
    deltaVRef.current.subVectors(toRef.current, fromRef.current);
    controls.enabled = false;
    prevGameRef.current = [...gameSpawn];
  }, [camera, gameSpawn]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (transitioningRef.current) {
      progressRef.current += delta;
      const t = Math.min(1, progressRef.current / TELEPORT_DURATION_SEC);
      visualRef.current.lerpVectors(fromRef.current, toRef.current, t);
      deltaVRef.current.subVectors(toRef.current, fromRef.current);
      camera.position.copy(camStartRef.current).addScaledVector(deltaVRef.current, t);
      controls.target
        .copy(tgtStartRef.current)
        .addScaledVector(deltaVRef.current, t);
      controls.update();
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld();
      if (t >= 1) {
        transitioningRef.current = false;
        visualRef.current.copy(toRef.current);
        controls.enabled = true;
        controls.update();
      }
    } else {
      controls.update();
    }
  });

  return (
    <VisualSpawnContext.Provider value={visualRef}>
      {children}
    </VisualSpawnContext.Provider>
  );
}

/** Mid Z for goal corridor; used by static goal-area light (does not follow rolling goal X/Z). */
const MID_GOAL_Z = (GOAL_Z_MIN + GOAL_Z_MAX) / 2;

/**
 * Two world-fixed key lights (spawn and goal regions). They do not follow `spawnCenter` or the camera.
 * Shadow cameras are sized to cover the initial field plane.
 */
function StaticSceneLights() {
  const { scene } = useThree();
  const spawnLightRef = useRef<THREE.DirectionalLight>(null);
  const goalLightRef = useRef<THREE.DirectionalLight>(null);

  useLayoutEffect(() => {
    const configureShadow = (light: THREE.DirectionalLight) => {
      const cam = light.shadow.camera as THREE.OrthographicCamera;
      light.shadow.mapSize.set(2048, 2048);
      light.shadow.bias = -0.00008;
      light.shadow.normalBias = 0.025;
      cam.near = 0.5;
      cam.far = 480;
      cam.left = -90;
      cam.right = 90;
      cam.top = 90;
      cam.bottom = -90;
      cam.updateProjectionMatrix();
    };
    const spawn = spawnLightRef.current;
    const goal = goalLightRef.current;
    if (spawn) configureShadow(spawn);
    if (goal) configureShadow(goal);
  }, []);

  useLayoutEffect(() => {
    const spawn = spawnLightRef.current;
    const goal = goalLightRef.current;
    if (spawn) {
      if (spawn.target.parent !== scene) scene.add(spawn.target);
      spawn.target.position.set(0, 0, 0);
    }
    if (goal) {
      if (goal.target.parent !== scene) scene.add(goal.target);
      goal.target.position.set(0, 0, MID_GOAL_Z);
    }
  }, [scene]);

  return (
    <>
      <ambientLight intensity={0.42} />
      <hemisphereLight
        color="#bfe8ff"
        groundColor="#4a9d52"
        intensity={0.32}
      />
      <directionalLight
        ref={spawnLightRef}
        position={[-12, 30, -16]}
        intensity={0.72}
        castShadow
      />
      <directionalLight
        ref={goalLightRef}
        position={[14, 38, MID_GOAL_Z + 42]}
        intensity={0.62}
        castShadow
      />
    </>
  );
}

function Block({ center, color }: { center: Vec3; color: string }) {
  return (
    <mesh position={[...center]} castShadow receiveShadow>
      <boxGeometry args={[BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE]} />
      {/* Standard material so key lights + shadows read clearly */}
      <meshStandardMaterial
        color={color}
        roughness={0.65}
        metalness={0.08}
      />
    </mesh>
  );
}

/** Wide, flat water hazard — sky-colored slab barely above the green field plane. */
function PenaltyPond({
  center,
  halfX,
  halfZ,
  surfaceLayer,
}: {
  center: Vec3;
  halfX: number;
  halfZ: number;
  surfaceLayer: 0 | 1;
}) {
  const drop = surfaceLayer === 0 ? 0 : POND_SECOND_SURFACE_DROP;
  return (
    <mesh
      position={[center[0], POND_VIS_CENTER_Y - drop, center[2]]}
      receiveShadow
      renderOrder={1 + surfaceLayer}
    >
      <boxGeometry
        args={[halfX * 2, POND_HALF_Y_VIS * 2, halfZ * 2]}
      />
      <meshStandardMaterial
        color={BG}
        roughness={0.26}
        metalness={0.16}
        polygonOffset
        polygonOffsetFactor={3 + surfaceLayer}
        polygonOffsetUnits={4 + surfaceLayer}
      />
    </mesh>
  );
}

/** Fixed tee pad at initial spawn (world origin): same green as goal, slightly above pond top. */
function SpawnTeePad() {
  const meshRef = useRef<THREE.Mesh>(null);

  useLayoutEffect(() => {
    const m = meshRef.current;
    if (!m) return;
    m.raycast = () => {};
  }, []);

  return (
    <mesh
      ref={meshRef}
      position={[0, TEE_PAD_CENTER_Y - .55, 0]}
      receiveShadow
      castShadow
    >
      <boxGeometry
        args={[
          TEE_PAD_HALF_X * 2,
          TEE_PAD_HALF_Y * 6,
          TEE_PAD_HALF_Z * 2,
        ]}
      />
      <meshStandardMaterial
        color={GOAL_GREEN}
        roughness={0.65}
        metalness={0.08}
        polygonOffset
        polygonOffsetFactor={1}
        polygonOffsetUnits={1}
      />
    </mesh>
  );
}

/** Corner “wheels”: no raycast so clicks still hit the vehicle body. */
function VehicleCornerBlock({
  position: pos,
  size,
  color,
}: {
  position: Vec3;
  size: number;
  color: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useLayoutEffect(() => {
    const m = meshRef.current;
    if (!m) return;
    m.raycast = () => {};
  }, []);

  return (
    <mesh ref={meshRef} position={[...pos]} castShadow receiveShadow>
      <boxGeometry args={[size, size, size]} />
      <meshStandardMaterial
        color={color}
        roughness={0.6}
        metalness={0.1}
      />
    </mesh>
  );
}

/**
 * 3-sided cylinder (triangular prism) along the shot direction from the cube center.
 * Default elevation comes from the vehicle; horizontal aim is `aimYawRad`. Pivot is the
 * spawn block center (middle of the cube). Raycast disabled so it does not steal clicks.
 */
function AimYawPrism({
  spawnCenter,
  aimYawRad,
  defaultVerticalAngleRad,
  prismLength,
  color = AIM_PRISM_COLOR,
}: {
  spawnCenter: Vec3;
  aimYawRad: number;
  /** Pitch above horizontal (radians), from vehicle config — matches launch trajectory. */
  defaultVerticalAngleRad: number;
  /** Cylinder height along aim; scales with vehicle base strength. */
  prismLength: number;
  /** Aim wedge tint; defaults to light cyan when omitted. */
  color?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useLayoutEffect(() => {
    const m = meshRef.current;
    if (!m) return;
    m.raycast = () => {};
  }, []);

  const { position, quaternion } = useMemo(() => {
    const cosP = Math.cos(defaultVerticalAngleRad);
    const sinP = Math.sin(defaultVerticalAngleRad);
    const sinY = Math.sin(aimYawRad);
    const cosY = Math.cos(aimYawRad);
    const dir = new THREE.Vector3(
      sinY * cosP,
      sinP,
      cosY * cosP
    ).normalize();
    const sx = spawnCenter[0];
    const sy = spawnCenter[1];
    const sz = spawnCenter[2];
    const h = prismLength;
    const pos = new THREE.Vector3(
      sx + dir.x * (h / 2),
      sy + dir.y * (h / 2),
      sz + dir.z * (h / 2)
    );
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return { position: pos, quaternion: q };
  }, [spawnCenter, aimYawRad, defaultVerticalAngleRad, prismLength]);

  return (
    <mesh
      ref={meshRef}
      position={position}
      quaternion={quaternion}
      castShadow
      receiveShadow
    >
      <cylinderGeometry
        args={[AIM_PRISM_RADIUS, AIM_PRISM_RADIUS, prismLength, 3]}
      />
      <meshStandardMaterial
        color={color}
        roughness={0.28}
        metalness={0.22}
      />
    </mesh>
  );
}

/**
 * Fixed XZ ground for the starting layout: a bit past yellow lane width and past max spawn→goal Z.
 */
function InitialFieldGround() {
  const width = 2 * (2 * FIELD_PLANE_HALF_WIDTH_X);
  const z0 = -FIELD_PLANE_Z_BEFORE_SPAWN;
  const z1 = GOAL_Z_MAX + FIELD_PLANE_Z_PAST_GOAL;
  const depth = 2 * (z1 - z0);
  const zCenter = (z0 + z1) / 2;
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -BLOCK_SIZE / 2, zCenter]}
      receiveShadow
    >
      <planeGeometry args={[width, depth]} />
      <meshStandardMaterial
        color={FIELD_GROUND_MUTED_GREEN}
        side={THREE.DoubleSide}
        roughness={0.92}
        metalness={0}
      />
    </mesh>
  );
}

/** Axis-aligned grid steps from lane origin to goal (Z first, then X); includes goal as last point. */
function manhattanPathLaneToGoal(laneOrigin: Vec3, goalCenter: Vec3): Vec3[] {
  const sy = laneOrigin[1];
  let x = laneOrigin[0];
  let z = laneOrigin[2];
  const tx = goalCenter[0];
  const tz = goalCenter[2];
  const out: Vec3[] = [];
  while (z !== tz) {
    z += Math.sign(tz - z) || 0;
    out.push([x, sy, z]);
  }
  while (x !== tx) {
    x += Math.sign(tx - x) || 0;
    out.push([x, sy, z]);
  }
  return out;
}

/**
 * Evenly spaced along the grid path from lane origin toward goal; five pairs on −X and +X,
 * offset from the lane centerline by LANE_MARKER_SIDE_OFFSET_X. Centers sit on integer grid cells.
 */
function laneMarkerCenters(laneOrigin: Vec3, goalCenter: Vec3): Vec3[] {
  const path = manhattanPathLaneToGoal(laneOrigin, goalCenter);
  if (path.length < 2) return [];
  const interior = path.slice(0, -1);
  const n = interior.length;
  const sy = laneOrigin[1];
  const out: Vec3[] = [];
  for (let i = 1; i <= LANE_MARKER_COUNT_PER_SIDE; i++) {
    const idx = Math.floor((i / (LANE_MARKER_COUNT_PER_SIDE + 1)) * n);
    const cx = interior[idx][0];
    const cz = interior[idx][2];
    out.push([cx - LANE_MARKER_SIDE_OFFSET_X, sy, cz]);
    out.push([cx + LANE_MARKER_SIDE_OFFSET_X, sy, cz]);
  }
  return out;
}

function SphereToGoal({
  meshRef,
  projectileRef,
  spawnCenter,
  ponds,
  goalCenter,
  gravityY,
  bounceRestitution,
  rollDeceleration,
  onProjectileEnd,
}: {
  meshRef: React.RefObject<THREE.Mesh | null>;
  projectileRef: React.MutableRefObject<Projectile | null>;
  spawnCenter: Vec3;
  ponds: readonly PondSpec[];
  goalCenter: Vec3;
  gravityY: number;
  bounceRestitution: number;
  rollDeceleration: number;
  onProjectileEnd: (outcome: "hit" | "miss" | "penalty", landing?: Vec3) => void;
}) {
  const sx = spawnCenter[0];
  const spawnTopY = spawnTopYFromBlockCenterY(spawnCenter[1]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    const p = projectileRef.current;
    if (!mesh || !p) return;

    const dt = Math.min(delta, 0.05);

    if (p.rolling) {
      const h = Math.hypot(p.vx, p.vz);
      const decel = rollDeceleration * dt;
      const hNew = h > 0 ? Math.max(0, h - decel) : 0;
      if (h > 1e-8) {
        const scale = hNew / h;
        p.vx *= scale;
        p.vz *= scale;
      } else {
        p.vx = 0;
        p.vz = 0;
      }
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.y = FLOOR_CONTACT_CENTER_Y;
      mesh.rotation.x += (p.vz * dt) / SPHERE_RADIUS;
      mesh.rotation.z -= (p.vx * dt) / SPHERE_RADIUS;
      mesh.position.set(p.x, p.y, p.z);

      for (const pond of ponds) {
        const obstacleCenter: Vec3 = [
          pond.worldX,
          INITIAL_LANE_ORIGIN[1],
          pond.worldZ,
        ];
        const hitObstacle = sphereIntersectsAabb(
          p.x,
          p.y,
          p.z,
          SPHERE_RADIUS,
          obstacleCenter,
          pond.halfX,
          GOAL_HALF,
          pond.halfZ
        );
        if (hitObstacle) {
          projectileRef.current = null;
          mesh.visible = false;
          onProjectileEnd("penalty");
          return;
        }
      }

      const hitGoal = sphereIntersectsGoalBox(
        p.x,
        p.y,
        p.z,
        SPHERE_RADIUS,
        goalCenter
      );
      if (hitGoal) {
        projectileRef.current = null;
        mesh.visible = false;
        onProjectileEnd("hit");
        return;
      }

      if (Math.hypot(p.vx, p.vz) <= ROLL_STOP_SPEED) {
        projectileRef.current = null;
        mesh.visible = false;
        onProjectileEnd("miss", [p.x, spawnCenter[1], p.z]);
      }
      return;
    }

    const x0 = p.x;
    const y0 = p.y;
    const z0 = p.z;

    p.vy += gravityY * dt;
    const vyAfterGravity = p.vy;
    p.x += p.vx * dt;
    p.y += vyAfterGravity * dt;
    p.z += p.vz * dt;
    mesh.position.set(p.x, p.y, p.z);

    for (const pond of ponds) {
      const obstacleCenter: Vec3 = [
        pond.worldX,
        INITIAL_LANE_ORIGIN[1],
        pond.worldZ,
      ];
      const hitObstacle = sphereIntersectsAabb(
        p.x,
        p.y,
        p.z,
        SPHERE_RADIUS,
        obstacleCenter,
        pond.halfX,
        GOAL_HALF,
        pond.halfZ
      );
      if (hitObstacle) {
        projectileRef.current = null;
        mesh.visible = false;
        onProjectileEnd("penalty");
        return;
      }
    }

    const hitGoal = sphereIntersectsGoalBox(
      p.x,
      p.y,
      p.z,
      SPHERE_RADIUS,
      goalCenter
    );
    if (hitGoal) {
      projectileRef.current = null;
      mesh.visible = false;
      onProjectileEnd("hit");
      return;
    }

    if (p.y > FLOOR_CONTACT_CENTER_Y) return;

    let landingX = p.x;
    let landingZ = p.z;
    if (y0 > FLOOR_CONTACT_CENTER_Y && p.y !== y0) {
      const t =
        (FLOOR_CONTACT_CENTER_Y - y0) / (p.y - y0);
      landingX = x0 + t * (p.x - x0);
      landingZ = z0 + t * (p.z - z0);
    }

    const canBounce =
      p.bouncesRemaining > 0 &&
      vyAfterGravity < 0 &&
      bounceRestitution > 0;
    if (canBounce) {
      p.x = landingX;
      p.y = FLOOR_CONTACT_CENTER_Y;
      p.z = landingZ;
      p.vy = -vyAfterGravity * bounceRestitution;
      p.bouncesRemaining -= 1;
      mesh.position.set(p.x, p.y, p.z);
      return;
    }

    const hPlan = Math.hypot(p.vx, p.vz);
    if (rollDeceleration > 0 && hPlan > ROLL_STOP_SPEED) {
      p.x = landingX;
      p.y = FLOOR_CONTACT_CENTER_Y;
      p.z = landingZ;
      p.vy = 0;
      p.rolling = true;
      mesh.position.set(p.x, p.y, p.z);
      return;
    }

    projectileRef.current = null;
    mesh.visible = false;
    /** Raw block center on ground; parent snaps to integer grid. */
    onProjectileEnd("miss", [landingX, spawnCenter[1], landingZ]);
  });

  return (
    <mesh
      ref={meshRef}
      position={[sx, spawnTopY, spawnCenter[2]]}
      visible={false}
      castShadow
      receiveShadow
    >
      <sphereGeometry args={[SPHERE_RADIUS, 24, 24]} />
      <meshStandardMaterial
        color="#e8f8ff"
        roughness={0.28}
        metalness={0.24}
      />
    </mesh>
  );
}

function SceneContent({
  spawnCenter,
  goalCenter,
  ponds,
  aimYawRad,
  cooldownUntil,
  roundLocked,
  vehicle,
  onChargeHudUpdate,
  onShootStart,
  onProjectileEnd,
  getPowerupMultiplier,
  resetPowerupStack,
}: {
  spawnCenter: Vec3;
  goalCenter: Vec3;
  ponds: readonly PondSpec[];
  aimYawRad: number;
  cooldownUntil: number | null;
  roundLocked: boolean;
  vehicle: PlayerVehicleConfig;
  onChargeHudUpdate: (
    next: { remainingMs: number; clicks: number } | null
  ) => void;
  onShootStart: () => void;
  onProjectileEnd: (outcome: "hit" | "miss" | "penalty", landing?: Vec3) => void;
  getPowerupMultiplier: () => number;
  resetPowerupStack: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const projectileRef = useRef<Projectile | null>(null);
  const chargingRef = useRef(false);
  const clickCountRef = useRef(1);
  const chargeEndsAtRef = useRef(0);
  const chargeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chargeTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (chargeTimerRef.current) clearTimeout(chargeTimerRef.current);
      if (chargeTickRef.current) clearInterval(chargeTickRef.current);
    };
  }, []);

  const fireProjectile = useCallback(
    (clicks: number) => {
      const force =
        launchStrengthFromClicks(clicks, vehicle) * getPowerupMultiplier();
      resetPowerupStack();
      const horizontalMag = force * Math.cos(vehicle.launchAngleRad);
      const vy = force * Math.sin(vehicle.launchAngleRad);
      const topY = spawnTopYFromBlockCenterY(spawnCenter[1]);
      const topZ = spawnCenter[2];
      const topX = spawnCenter[0];
      projectileRef.current = {
        x: topX,
        y: topY,
        z: topZ,
        vx: horizontalMag * Math.sin(aimYawRad),
        vy,
        vz: horizontalMag * Math.cos(aimYawRad),
        bouncesRemaining: vehicle.landingBounces,
        rolling: false,
      };
      const mesh = meshRef.current;
      if (!mesh) return;
      mesh.visible = true;
      mesh.rotation.set(0, 0, 0);
      mesh.position.set(topX, topY, topZ);
      onShootStart();
    },
    [aimYawRad, getPowerupMultiplier, onShootStart, resetPowerupStack, spawnCenter, vehicle]
  );

  const beginChargeWindow = useCallback(() => {
    const chargeMs = vehicleChargeMs(vehicle);
    if (chargeTimerRef.current) clearTimeout(chargeTimerRef.current);
    if (chargeTickRef.current) clearInterval(chargeTickRef.current);

    resetPowerupStack();
    clickCountRef.current = 1;
    chargingRef.current = true;
    chargeEndsAtRef.current = performance.now() + chargeMs;
    onChargeHudUpdate({
      remainingMs: chargeMs,
      clicks: 1,
    });

    chargeTickRef.current = setInterval(() => {
      const left = Math.max(0, chargeEndsAtRef.current - performance.now());
      onChargeHudUpdate({
        remainingMs: left,
        clicks: clickCountRef.current,
      });
      if (left <= 0 && chargeTickRef.current) {
        clearInterval(chargeTickRef.current);
        chargeTickRef.current = null;
      }
    }, 50);

    chargeTimerRef.current = setTimeout(() => {
      if (chargeTickRef.current) {
        clearInterval(chargeTickRef.current);
        chargeTickRef.current = null;
      }
      chargeTimerRef.current = null;
      chargingRef.current = false;

      const n = clickCountRef.current;
      onChargeHudUpdate(null);
      fireProjectile(n);
    }, chargeMs);
  }, [fireProjectile, onChargeHudUpdate, resetPowerupStack, vehicle]);

  const yellowLaneMarkers = useMemo(
    () => laneMarkerCenters(INITIAL_LANE_ORIGIN, goalCenter),
    [goalCenter]
  );

  const onSpawnPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (roundLocked) return;
      if (cooldownUntil !== null && Date.now() < cooldownUntil) return;
      if (projectileRef.current) return;

      if (chargingRef.current) {
        clickCountRef.current += 1;
        onChargeHudUpdate({
          remainingMs: Math.max(
            0,
            chargeEndsAtRef.current - performance.now()
          ),
          clicks: clickCountRef.current,
        });
        return;
      }

      beginChargeWindow();
    },
    [roundLocked, cooldownUntil, beginChargeWindow, onChargeHudUpdate]
  );

  const half = BLOCK_SIZE / 2;
  const w = VEHICLE_CORNER_BLOCK_SIZE;
  const wh = 0 ;
  /** Wheel center Y: bottom at −half + eps (flush with / just above green plane at y = −half). */
  const wheelCenterY = -half + wh + VEHICLE_WHEEL_FLOOR_Y_EPS;
  /** Axis distance so inner wheel face sits past the vehicle hull (+ outward gap). */
  const wheelArm = half + VEHICLE_WHEEL_OUTWARD + wh;
  /** Bottom-corner wheel centers in local space (group origin = spawn block center). */
  const vehicleCornerOffsets: Vec3[] = [
    [-wheelArm, wheelCenterY, -wheelArm],
    [wheelArm, wheelCenterY, -wheelArm],
    [-wheelArm, wheelCenterY, wheelArm],
    [wheelArm, wheelCenterY, wheelArm],
  ];

  const bodyColor = rgbTupleToCss(vehicle.mainRgb);
  const accentColor = rgbTupleToCss(vehicle.accentRgb);

  return (
    <>
      <SpawnTeePad />
      <SpawnVisualGroup>
        <mesh onPointerDown={onSpawnPointerDown} castShadow receiveShadow>
          <boxGeometry args={[BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE]} />
          <meshStandardMaterial
            color={bodyColor}
            roughness={0.32}
            metalness={0.2}
          />
        </mesh>
        {vehicleCornerOffsets.map((pos, i) => (
          <VehicleCornerBlock
            key={`wheel-${i}`}
            position={pos}
            size={VEHICLE_CORNER_BLOCK_SIZE}
            color={accentColor}
          />
        ))}
        <AimYawPrism
          spawnCenter={[0, 0, 0]}
          aimYawRad={aimYawRad}
          defaultVerticalAngleRad={vehicle.launchAngleRad}
          prismLength={aimPrismLengthForStrength(vehicle.strengthPerBaseClick)}
          color={accentColor}
        />
      </SpawnVisualGroup>
      <Block center={goalCenter} color={GOAL_BLOCK_COLOR} />
      {ponds.map((pond, i) => (
        <PenaltyPond
          key={`pond-${i}-${pond.worldX}-${pond.worldZ}-${pond.halfX}-${pond.halfZ}`}
          center={[
            pond.worldX,
            INITIAL_LANE_ORIGIN[1],
            pond.worldZ,
          ]}
          halfX={pond.halfX}
          halfZ={pond.halfZ}
          surfaceLayer={pond.surfaceLayer}
        />
      ))}
      {yellowLaneMarkers.map((center, i) => (
        <mesh key={`lane-${i}`} position={[...center]} castShadow receiveShadow>
          <boxGeometry args={[BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE]} />
          <meshStandardMaterial
            color={LANE_MARKER_COLOR}
            roughness={0.6}
            metalness={0.05}
          />
        </mesh>
      ))}
      <SphereToGoal
        meshRef={meshRef}
        projectileRef={projectileRef}
        spawnCenter={spawnCenter}
        ponds={ponds}
        goalCenter={goalCenter}
        gravityY={vehicle.gravityY}
        bounceRestitution={vehicle.bounceRestitution}
        rollDeceleration={vehicle.rollDeceleration}
        onProjectileEnd={onProjectileEnd}
      />
    </>
  );
}

function HelpModal({
  open,
  onClose,
  vehicle,
}: {
  open: boolean;
  onClose: () => void;
  vehicle: PlayerVehicleConfig;
}) {
  if (!open) return null;

  const chargeSec = vehicle.secondsBeforeShotTrigger;
  const cooldownSec = vehicle.shotCooldownSeconds;
  const launchDeg = THREE.MathUtils.radToDeg(vehicle.launchAngleRad);
  const yawDeg = THREE.MathUtils.radToDeg(AIM_YAW_STEP_RAD);

  const reloadWithVehicle = (vId: string) => {
    const url = new URL(window.location.href);
    if (vId === DEFAULT_V_ID) {
      url.searchParams.delete("vehicle");
    } else {
      url.searchParams.set("vehicle", vId);
    }
    window.location.assign(url.toString());
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
      style={modalBackdrop}
      onClick={onClose}
    >
      <div
        style={helpModalCard}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="help-title"
          style={{
            margin: "0 0 10px",
            fontSize: 16,
            fontWeight: 700,
            color: hudColors.value,
          }}
        >
          Help
        </h2>
        <details>
          <summary
            style={{
              color: hudColors.value,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 8,
            }}
          >
            How to play
          </summary>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              color: hudColors.label,
              fontSize: 12,
              lineHeight: 1.55,
            }}
          >
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: hudColors.value }}>Aim</strong> — ⇐ / ⇒
              jump a quarter turn; ← → nudge ({yawDeg.toFixed(0)}° per tap). The
              white wedge points where the shot goes.
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: hudColors.value }}>Shoot</strong> — Click
              the spawn block. The first click starts a {chargeSec}s charge
              window.
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: hudColors.value }}>Power</strong> — Extra
              clicks in that window add about +
              {Math.round(vehicle.extraClickStrengthFraction * 100)}% strength
              each. When the timer ends, the ball launches at {launchDeg.toFixed(0)}
              ° along your aim.
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: hudColors.value }}>Power-ups</strong> —
              five slots in the aim panel (left to right). Only{" "}
              <strong style={{ color: hudColors.value }}>Strength</strong> is
              available for now.
              <ul
                style={{
                  margin: "8px 0 0",
                  paddingLeft: 16,
                  listStyleType: "disc",
                }}
              >
                <li style={{ marginBottom: 6 }}>
                  <strong style={{ color: hudColors.value }}>Strength</strong>{" "}
                  (lightning icon) — The number under the icon is how many charges
                  you have. Each tap multiplies launch strength by 2 for this shot
                  and spends one charge (you start with {INITIAL_POWERUP_CHARGES}).
                  Stacks multiply (2×, 4×, 8×, …).
                </li>
                <li style={{ marginBottom: 6, opacity: 0.85 }}>
                  <strong style={{ color: hudColors.value }}>Precision</strong>{" "}
                  (crosshair icon) — Coming soon: tighter aim so the ball tracks
                  closer to your wedge direction.
                </li>
                <li style={{ marginBottom: 6, opacity: 0.85 }}>
                  <strong style={{ color: hudColors.value }}>Time</strong> (clock
                  icon) — Coming soon: briefly extends the charge window.
                </li>
                <li style={{ marginBottom: 6, opacity: 0.85 }}>
                  <strong style={{ color: hudColors.value }}>Magnet</strong> (magnet
                  icon) — Coming soon: slight pull toward the goal while the ball is
                  in flight.
                </li>
                <li style={{ opacity: 0.85 }}>
                  <strong style={{ color: hudColors.value }}>Lucky</strong> (star
                  icon) — Coming soon: random bonus on goal contact or bounce.
                </li>
              </ul>
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: hudColors.value }}>Goal</strong> — Hit the
              green cube to finish the round. If you miss, you get a{" "}
              {cooldownSec}s cooldown; your spawn moves to where the ball landed.
            </li>
            <li>
              <strong style={{ color: hudColors.value }}>Camera</strong> — Drag to
              orbit, scroll to zoom.
            </li>
          </ul>
        </details>
        <details
          style={{
            marginTop: 14,
          }}
        >
          <summary
            style={{
              color: hudColors.value,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 8,
            }}
          >
            Vehicles
          </summary>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            {PREDETERMINED_VEHICLES.map((v) => {
              const isCurrent = v.id === vehicle.id;
              const mainCss = rgbTupleToCss(v.mainRgb);
              const accentCss = rgbTupleToCss(v.accentRgb);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => reloadWithVehicle(v.id)}
                  title={`Load ${v.name} and start a new round`}
                  style={{
                    ...goldChipButtonStyle(),
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "6px 12px",
                    backgroundImage: `linear-gradient(135deg, ${mainCss} 0%, ${accentCss} 100%)`,
                    border: "1px solid rgba(255,255,255,0.88)",
                    color: "#ffffff",
                    textShadow: "0 1px 2px rgba(0,0,0,0.55)",
                    ...(isCurrent
                      ? {
                          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.45), 0 3px 12px rgba(0,0,0,0.28), 0 0 0 2px ${accentCss}, 0 0 14px ${accentCss}`,
                        }
                      : {
                          boxShadow:
                            "inset 0 1px 0 rgba(255,255,255,0.35), 0 3px 10px rgba(0,0,0,0.22)",
                        }),
                  }}
                >
                  {v.name}
                </button>
              );
            })}
          </div>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: 10,
              lineHeight: 1.4,
              color: hudColors.muted,
            }}
          >
            Picks the URL query and reloads the page so you start fresh with
            that vehicle&apos;s shot stats.
          </p>
        </details>
        <button
          type="button"
          onClick={onClose}
          style={{
            ...goldPillButtonStyle({ disabled: false, fullWidth: true }),
            marginTop: 14,
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function FinishGameModal({
  open,
  sessionShots,
}: {
  open: boolean;
  sessionShots: number;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="finish-title"
      style={modalBackdrop}
    >
      <div style={modalCard}>
        <h2
          id="finish-title"
          style={{
            margin: "0 0 6px",
            fontSize: 17,
            fontWeight: 700,
            color: hudColors.value,
          }}
        >
          Level complete
        </h2>
        <p
          style={{
            margin: "0 0 10px",
            fontSize: 13,
            color: hudColors.muted,
            lineHeight: 1.5,
          }}
        >
          You hit the goal. More levels coming later.
        </p>
        <p
          style={{
            margin: "0 0 16px",
            fontSize: 13,
            color: hudColors.label,
            lineHeight: 1.5,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          Shots this round:{" "}
          <strong style={{ color: hudColors.value }}>{sessionShots}</strong>
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={goldPillButtonStyle({ disabled: false, fullWidth: true })}
        >
          Next round
        </button>
      </div>
    </div>
  );
}

function formatVec3(v: Vec3): string {
  return `${v[0]}, ${v[1]}, ${v[2]}`;
}

/** Inline SVG (no icon font / CDN). */
function HudIdleClockIcon({ color }: { color: string }) {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      aria-hidden
      style={{ display: "block", flexShrink: 0, color }}
    >
      <path
        fill="currentColor"
        d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"
      />
    </svg>
  );
}

function HudIdleBoltIcon({ color }: { color: string }) {
  return (
    <svg
      width={15}
      height={15}
      viewBox="0 0 24 24"
      aria-hidden
      style={{ display: "block", flexShrink: 0, color }}
    >
      <path fill="currentColor" d="M7 2v11h3v9l7-12h-4l4-8H7z" />
    </svg>
  );
}

function StatsHud({
  spawnCenter,
  sessionShots,
  chargeHud,
  shotInFlight,
  cooldownUntil,
  powerupCharges,
  powerupStackCount,
  vehicle,
}: {
  spawnCenter: Vec3;
  sessionShots: number;
  chargeHud: { remainingMs: number; clicks: number } | null;
  shotInFlight: boolean;
  cooldownUntil: number | null;
  powerupCharges: number;
  powerupStackCount: number;
  vehicle: PlayerVehicleConfig;
}) {
  const remainingMs =
    cooldownUntil !== null ? Math.max(0, cooldownUntil - Date.now()) : 0;
  const inCooldown = cooldownUntil !== null && remainingMs > 0;
  const charging = chargeHud !== null;
  const powerupMult = Math.pow(2, powerupStackCount);

  const metricsDivider: CSSProperties = {
    marginTop: 8,
    paddingTop: 8,
    borderTop: "1px solid rgba(0, 80, 110, 0.12)",
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        zIndex: 40,
        pointerEvents: "none",
        userSelect: "none",
        padding: "6px 8px",
        maxWidth: 220,
        ...hudMiniPanel,
        fontSize: 10,
        lineHeight: 1.4,
      }}
    >
      <div
        style={{
          color: hudColors.muted,
          marginBottom: 2,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        Shots (session)
      </div>
      <div
        style={{
          color: hudColors.value,
          fontWeight: 700,
          fontSize: 14,
          fontVariantNumeric: "tabular-nums",
          marginBottom: 10,
        }}
      >
        {sessionShots}
      </div>
      <div
        style={{
          color: hudColors.muted,
          marginBottom: 2,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        Vehicle
      </div>
      <div
        style={{
          color: hudColors.value,
          fontWeight: 600,
          fontSize: 10,
          marginBottom: 6,
        }}
      >
        {vehicle.name}
      </div>
      <div
        style={{
          color: hudColors.muted,
          marginBottom: 2,
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        Position
      </div>
      <div
        style={{
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          color: hudColors.value,
          fontWeight: 600,
        }}
      >
        ({formatVec3(spawnCenter)})
      </div>

      {shotInFlight && (
        <div style={{ ...metricsDivider, color: hudColors.value, fontSize: 10 }}>
          Shot in flight…
        </div>
      )}

      {charging && !shotInFlight && chargeHud && (
        <div style={metricsDivider}>
          <div style={{ lineHeight: 1.35, fontSize: 9, color: hudColors.label }}>
            Time left:{" "}
            <strong
              style={{
                color: hudColors.value,
                fontVariantNumeric: "tabular-nums",
                fontWeight: 600,
              }}
            >
              {(chargeHud.remainingMs / 1000).toFixed(1)}
            </strong>
            s · Clicks:{" "}
            <strong
              style={{
                color: hudColors.accent,
                fontVariantNumeric: "tabular-nums",
                fontWeight: 600,
              }}
            >
              {chargeHud.clicks}
            </strong>
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 9,
              lineHeight: 1.35,
              color: hudColors.label,
            }}
          >
            Strength{" "}
            <strong
              style={{
                color: hudColors.value,
                fontVariantNumeric: "tabular-nums",
                fontWeight: 600,
              }}
            >
              {(
                launchStrengthFromClicks(chargeHud.clicks, vehicle) *
                powerupMult
              ).toFixed(2)}
            </strong>
            {powerupStackCount > 0 && (
              <span style={{ color: hudColors.accent }}> (×{powerupMult})</span>
            )}
            <span style={{ color: hudColors.muted }}>
              {" "}
              · +
              {Math.round(vehicle.extraClickStrengthFraction * 100)}% / extra
              click
            </span>
          </div>
        </div>
      )}

      {inCooldown && !shotInFlight && !charging && (
        <div style={{ ...metricsDivider, fontSize: 9, color: hudColors.label }}>
          Next shot in{" "}
          <strong
            style={{
              color: hudColors.value,
              fontVariantNumeric: "tabular-nums",
              fontWeight: 600,
            }}
          >
            {(remainingMs / 1000).toFixed(1)}
          </strong>
          s · Boost left: {powerupCharges}
        </div>
      )}

      {!shotInFlight && !inCooldown && !charging && (
        <div
          role="status"
          aria-label={`Charge window ${vehicle.secondsBeforeShotTrigger} seconds, ${powerupCharges} boost charges available`}
          style={{
            ...metricsDivider,
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: hudColors.muted,
            fontSize: 10,
            lineHeight: 1,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontVariantNumeric: "tabular-nums",
            }}
            title="Charge window length"
          >
            <HudIdleClockIcon color={hudColors.accent} />
            {vehicle.secondsBeforeShotTrigger}s
          </span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontVariantNumeric: "tabular-nums",
            }}
            title="Boost charges left"
          >
            <HudIdleBoltIcon color={hudColors.accent} />
            {powerupCharges}
          </span>
        </div>
      )}
    </div>
  );
}

function aimQuarterButtonStyle(disabled: boolean): CSSProperties {
  return {
    ...goldIconButtonStyle(disabled),
    minWidth: 36,
    width: 36,
    paddingLeft: 0,
    paddingRight: 0,
    fontSize: 16,
    fontWeight: 900,
  };
}

function AimHud({
  aimYawRad,
  disabled,
  onMinus90,
  onLeft,
  onRight,
  onPlus90,
}: {
  aimYawRad: number;
  disabled: boolean;
  onMinus90: () => void;
  onLeft: () => void;
  onRight: () => void;
  onPlus90: () => void;
}) {
  const deg = THREE.MathUtils.radToDeg(aimYawRad);
  return (
    <div
      style={{
        ...hudAimPanelStrip,
        ...hudFont,
      }}
    >
      <button
        type="button"
        aria-label="Aim plus 90 degrees"
        disabled={disabled}
        onClick={onPlus90}
        style={aimQuarterButtonStyle(disabled)}
      >
        ⇐
      </button>
      <button
        type="button"
        aria-label="Aim left"
        disabled={disabled}
        onClick={onLeft}
        style={goldIconButtonStyle(disabled)}
      >
        ←
      </button>
      <span
        style={{
          minWidth: 92,
          textAlign: "center",
          fontSize: 12,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "0.01em",
          ...hudBottomReadoutLabel,
        }}
      >
        Aim{" "}
        <span
          style={{
            ...hudBottomReadoutValue,
            fontWeight: 700,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {deg >= 0 ? "+" : ""}
          {deg.toFixed(1)}°
        </span>
      </span>
      <button
        type="button"
        aria-label="Aim right"
        disabled={disabled}
        onClick={onRight}
        style={goldIconButtonStyle(disabled)}
      >
        →
      </button>
      <button
        type="button"
        aria-label="Aim minus 90 degrees"
        disabled={disabled}
        onClick={onMinus90}
        style={aimQuarterButtonStyle(disabled)}
      >
        ⇒
      </button>
    </div>
  );
}

function ShotHud({
  shotInFlight,
  cooldownUntil,
  chargeHud,
  powerupCharges,
  onPowerup,
  vehicle,
}: {
  shotInFlight: boolean;
  cooldownUntil: number | null;
  chargeHud: { remainingMs: number; clicks: number } | null;
  powerupCharges: number;
  onPowerup: () => void;
  vehicle: PlayerVehicleConfig;
}) {
  const chargeMs = vehicleChargeMs(vehicle);
  const cooldownMs = vehicleShotCooldownMs(vehicle);
  const remainingMs =
    cooldownUntil !== null ? Math.max(0, cooldownUntil - Date.now()) : 0;
  const inCooldown = cooldownUntil !== null && remainingMs > 0;
  const progress =
    inCooldown && cooldownMs > 0 ? remainingMs / cooldownMs : 0;
  const charging = chargeHud !== null;
  const chargeProgress =
    charging && chargeMs > 0 ? chargeHud.remainingMs / chargeMs : 0;
  const canUsePowerup =
    charging && !shotInFlight && powerupCharges > 0;

  if (charging && !shotInFlight && chargeHud) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: 6,
          width: "100%",
          pointerEvents: "none",
          userSelect: "none",
          ...hudFont,
        }}
      >
        <div
          style={{
            pointerEvents: "auto",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: 4,
              width: "100%",
            }}
          >
            {POWERUP_SLOTS.map((slot) => {
              if (slot.implemented) {
                return (
                  <button
                    key={slot.id}
                    type="button"
                    aria-label={`${slot.name}: multiply strength by 2 for this shot (${powerupCharges} charges left)`}
                    title={`${slot.name}: ×2 per tap · ${powerupCharges} charge${powerupCharges === 1 ? "" : "s"}`}
                    disabled={!canUsePowerup}
                    onClick={onPowerup}
                    style={powerupSlotStyle({
                      variant: canUsePowerup ? "ready" : "depleted",
                    })}
                  >
                    <PowerupHudIcon slotId={slot.id} color="currentColor" />
                    <span
                      style={{
                        fontVariantNumeric: "tabular-nums",
                        fontSize: 11,
                        lineHeight: 1,
                      }}
                    >
                      {powerupCharges}
                    </span>
                  </button>
                );
              }
              return (
                <button
                  key={slot.id}
                  type="button"
                  aria-label={`${slot.name}: not available yet`}
                  title={`${slot.name} — coming soon`}
                  disabled
                  style={powerupSlotStyle({ variant: "locked" })}
                >
                  <PowerupHudIcon slotId={slot.id} color="currentColor" />
                </button>
              );
            })}
          </div>
        </div>
        <div style={{ ...progressTrack, overflow: "hidden" }}>
          <div style={progressFillStyle(chargeProgress, "charge")} />
        </div>
      </div>
    );
  }

  if (inCooldown && !shotInFlight && !charging) {
    return (
      <div
        style={{
          width: "100%",
          pointerEvents: "none",
          ...hudFont,
        }}
      >
        <div style={{ ...progressTrack, overflow: "hidden" }}>
          <div style={progressFillStyle(progress, "cooldown")} />
        </div>
      </div>
    );
  }

  return null;
}

export default function CubeScene() {
  const searchParams = useSearchParams();
  const vehicleParam = searchParams.get("vehicle");
  const playerVehicle = useMemo(
    () => resolveVehicleFromUrlParam(vehicleParam),
    [vehicleParam]
  );

  const [game, dispatch] = useReducer(
    gameReducer,
    undefined,
    createInitialGameState
  );

  const goalCenter: Vec3 = [
    game.goalWorldX,
    INITIAL_LANE_ORIGIN[1],
    game.goalWorldZ,
  ];
  const gameSpawnRef = useRef<Vec3>(game.spawnCenter);
  gameSpawnRef.current = game.spawnCenter;
  const spawnBeforeShotRef = useRef<Vec3>(game.spawnCenter);

  const [aimYawRad, setAimYawRad] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [shotInFlight, setShotInFlight] = useState(false);
  const [sessionShots, setSessionShots] = useState(0);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [waterToastToken, setWaterToastToken] = useState(0);
  const [chargeHud, setChargeHud] = useState<{
    remainingMs: number;
    clicks: number;
  } | null>(null);
  const [, setHudTick] = useState(0);

  const powerupStackRef = useRef(0);
  const [powerupStackCount, setPowerupStackCount] = useState(0);
  const [powerupCharges, setPowerupCharges] = useState(INITIAL_POWERUP_CHARGES);

  const getPowerupMultiplier = useCallback(
    () => Math.pow(2, powerupStackRef.current),
    []
  );

  const resetPowerupStack = useCallback(() => {
    powerupStackRef.current = 0;
    setPowerupStackCount(0);
  }, []);

  const activatePowerup = useCallback(() => {
    if (chargeHud === null || shotInFlight) return;
    if (powerupCharges <= 0) return;
    powerupStackRef.current += 1;
    setPowerupStackCount(powerupStackRef.current);
    setPowerupCharges((c) => c - 1);
  }, [chargeHud, shotInFlight, powerupCharges]);

  const onChargeHudUpdate = useCallback(
    (next: { remainingMs: number; clicks: number } | null) => {
      setChargeHud(next);
    },
    []
  );

  const onShootStart = useCallback(() => {
    setShotInFlight(true);
    spawnBeforeShotRef.current = gameSpawnRef.current;
    setSessionShots((n) => n + 1);
  }, []);

  const onProjectileEnd = useCallback(
    (outcome: "hit" | "miss" | "penalty", landing?: Vec3) => {
      setShotInFlight(false);
      if (outcome === "penalty") {
        setWaterToastToken((t) => t + 1);
        dispatch({
          type: "PROJECTILE_END",
          outcome: "penalty",
          revertSpawn: [...spawnBeforeShotRef.current] as Vec3,
        });
      } else {
        dispatch({
          type: "PROJECTILE_END",
          outcome,
          landing,
        });
      }
      if (outcome === "hit") {
        setShowFinishModal(true);
        return;
      }
      setCooldownUntil(performance.now() + vehicleShotCooldownMs(playerVehicle));
    },
    [playerVehicle]
  );

  useEffect(() => {
    if (!cooldownUntil) return;
    const id = setInterval(() => {
      setHudTick((t) => t + 1);
      if (Date.now() >= cooldownUntil) {
        setCooldownUntil(null);
      }
    }, 100);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  useEffect(() => {
    if (showFinishModal) setShowHelpModal(false);
  }, [showFinishModal]);

  useEffect(() => {
    if (!showHelpModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowHelpModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showHelpModal]);

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        background: BG,
      }}
    >
      <Canvas
        style={{ width: "100%", height: "100%", display: "block" }}
        onCreated={onCanvasCreated}
        gl={{ antialias: true, alpha: false, logarithmicDepthBuffer: true }}
        dpr={[1, 2]}
        shadows="soft"
      >
        <StaticSceneLights />
        <InitialFieldGround />
        <TeleportOrbitRig gameSpawn={game.spawnCenter}>
          <SceneContent
            spawnCenter={game.spawnCenter}
            goalCenter={goalCenter}
            ponds={game.ponds}
            aimYawRad={aimYawRad}
            cooldownUntil={cooldownUntil}
            roundLocked={showFinishModal}
            vehicle={playerVehicle}
            onChargeHudUpdate={onChargeHudUpdate}
            onShootStart={onShootStart}
            onProjectileEnd={onProjectileEnd}
            getPowerupMultiplier={getPowerupMultiplier}
            resetPowerupStack={resetPowerupStack}
          />
        </TeleportOrbitRig>
      </Canvas>
      <ToastNotif showToken={waterToastToken} message="Water hazard" />
      <StatsHud
        spawnCenter={game.spawnCenter}
        sessionShots={sessionShots}
        chargeHud={chargeHud}
        shotInFlight={shotInFlight}
        cooldownUntil={cooldownUntil}
        powerupCharges={powerupCharges}
        powerupStackCount={powerupStackCount}
        vehicle={playerVehicle}
      />
      {!showFinishModal && (
        <button
          type="button"
          aria-label="Open help"
          onClick={() => setShowHelpModal(true)}
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 42,
            ...goldChipButtonStyle(),
          }}
        >
          Help
        </button>
      )}
      {!showFinishModal && (
        <div
          className="hud-bottom-dock"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            zIndex: 41,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              ...hudBottomPanel,
              pointerEvents: "auto",
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              gap: 4,
            }}
          >
            {chargeHud === null && (
              <AimHud
                aimYawRad={aimYawRad}
                disabled={shotInFlight}
                onMinus90={() =>
                  setAimYawRad((a) =>
                    wrapYawRad(a - AIM_YAW_QUARTER_TURN_RAD)
                  )
                }
                onLeft={() =>
                  setAimYawRad((a) => wrapYawRad(a + AIM_YAW_STEP_RAD))
                }
                onRight={() =>
                  setAimYawRad((a) => wrapYawRad(a - AIM_YAW_STEP_RAD))
                }
                onPlus90={() =>
                  setAimYawRad((a) =>
                    wrapYawRad(a + AIM_YAW_QUARTER_TURN_RAD)
                  )
                }
              />
            )}
            <ShotHud
              shotInFlight={shotInFlight}
              cooldownUntil={cooldownUntil}
              chargeHud={chargeHud}
              powerupCharges={powerupCharges}
              onPowerup={activatePowerup}
              vehicle={playerVehicle}
            />
          </div>
        </div>
      )}
      <FinishGameModal open={showFinishModal} sessionShots={sessionShots} />
      <HelpModal
        open={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        vehicle={playerVehicle}
      />
    </div>
  );
}
