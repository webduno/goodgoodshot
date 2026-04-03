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
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
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

/** Sphere center Y when the ball rests on world floor y = 0 (bottom of sphere at floor). */
const FLOOR_CONTACT_CENTER_Y = SPHERE_RADIUS;

function snapBlockCenterToGrid(v: readonly [number, number, number]): Vec3 {
  return [Math.round(v[0]), Math.round(v[1]), Math.round(v[2])];
}

function randomIntInclusive(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

type GameState = {
  spawnCenter: Vec3;
  /** World-space Z of green goal center; unchanged on miss, rerolled only on hit. */
  goalWorldZ: number;
  /** World-space X of green goal center; unchanged on miss, rerolled only on hit. */
  goalWorldX: number;
};

type GameAction = {
  type: "PROJECTILE_END";
  outcome: "hit" | "miss";
  landing?: Vec3;
};

function createInitialGameState(): GameState {
  return {
    spawnCenter: [0, 0, 0],
    goalWorldZ: randomIntInclusive(GOAL_Z_MIN, GOAL_Z_MAX),
    goalWorldX: randomIntInclusive(GOAL_X_MIN, GOAL_X_MAX),
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

  if (action.outcome === "hit") {
    next = snapBlockCenterToGrid([
      prev[0],
      prev[1],
      state.goalWorldZ,
    ]);
    nextGoalWorldZ = next[2] + randomIntInclusive(GOAL_Z_MIN, GOAL_Z_MAX);
    nextGoalWorldX = randomIntInclusive(GOAL_X_MIN, GOAL_X_MAX);
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
  };
}

/** Green goal box AABB (same as the mesh: center + half extents). */
const GOAL_HALF = BLOCK_SIZE / 2;

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

/** Triangular prism on the spawn block: points along horizontal aim (+Z at 0° yaw). */
const AIM_PRISM_LENGTH = 0.85;
const AIM_PRISM_RADIUS = 0.14;
const AIM_PRISM_COLOR = "#f0fcff";

/** Ground plane for the initial field: wider than yellow lane span, longer than spawn→goal. */
const FIELD_PLANE_HALF_WIDTH_X =
  2 * (LANE_MARKER_SIDE_OFFSET_X / 2 + BLOCK_SIZE * 1.5);
const FIELD_PLANE_Z_BEFORE_SPAWN = 4 * BLOCK_SIZE;
const FIELD_PLANE_Z_PAST_GOAL = 12 * BLOCK_SIZE;
const FIELD_GROUND_MUTED_GREEN = "#3a9d4a";

function sphereIntersectsGoalBox(
  px: number,
  py: number,
  pz: number,
  radius: number,
  goalCenter: Vec3
): boolean {
  const cx = goalCenter[0];
  const cy = goalCenter[1];
  const cz = goalCenter[2];
  const minX = cx - GOAL_HALF;
  const maxX = cx + GOAL_HALF;
  const minY = cy - GOAL_HALF;
  const maxY = cy + GOAL_HALF;
  const minZ = cz - GOAL_HALF;
  const maxZ = cz + GOAL_HALF;

  const qx = THREE.MathUtils.clamp(px, minX, maxX);
  const qy = THREE.MathUtils.clamp(py, minY, maxY);
  const qz = THREE.MathUtils.clamp(pz, minZ, maxZ);
  const dx = px - qx;
  const dy = py - qy;
  const dz = pz - qz;
  return dx * dx + dy * dy + dz * dz < radius * radius;
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
};

/** Clear color + page chrome — Frutiger Aero sky (matches page gradient mid-tone). */
const BG = "#78d4ff";

/**
 * Camera offset from spawn block center (lane stays to +X so the goal stays visible).
 */
const CAMERA_OFFSET_FROM_SPAWN: Vec3 = [0.95, 1.22, -3.1];
/** Orbit pivot Y: one block above the spawn block center. */
const ORBIT_TARGET_Y_OFFSET = BLOCK_SIZE;
function onCanvasCreated({ camera, gl, scene }: RootState) {
  scene.background = new THREE.Color(BG);
  gl.setClearColor(new THREE.Color(BG), 1);

  if ("fov" in camera) {
    camera.fov = 72;
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld();
}

function CameraRig({ spawnCenter }: { spawnCenter: Vec3 }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  const prevSpawnRef = useRef<Vec3 | null>(null);
  const sx = spawnCenter[0];
  const sy = spawnCenter[1];
  const sz = spawnCenter[2];

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

    const prev = prevSpawnRef.current;
    if (prev === null) {
      camera.position.set(
        sx + CAMERA_OFFSET_FROM_SPAWN[0],
        sy + CAMERA_OFFSET_FROM_SPAWN[1],
        sz + CAMERA_OFFSET_FROM_SPAWN[2]
      );
    } else {
      const dx = sx - prev[0];
      const dy = sy - prev[1];
      const dz = sz - prev[2];
      camera.position.x += dx;
      camera.position.y += dy;
      camera.position.z += dz;
    }
    prevSpawnRef.current = [sx, sy, sz];

    controls.target.set(sx, sy + ORBIT_TARGET_Y_OFFSET, sz);
    controls.update();
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }, [camera, sx, sy, sz]);

  useFrame(() => {
    controlsRef.current?.update();
  });

  return null;
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
 * 3-sided cylinder (triangular prism) on top of the spawn block, aligned with yaw in the XZ plane.
 * Raycast disabled so it does not steal clicks from the spawn block.
 */
function AimYawPrism({
  spawnCenter,
  aimYawRad,
  color = AIM_PRISM_COLOR,
}: {
  spawnCenter: Vec3;
  aimYawRad: number;
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
    const dir = new THREE.Vector3(
      Math.sin(aimYawRad),
      0,
      Math.cos(aimYawRad)
    ).normalize();
    const sx = spawnCenter[0];
    const sy = spawnCenter[1];
    const sz = spawnCenter[2];
    const topY = sy + BLOCK_SIZE / 2 + 0.002;
    const h = AIM_PRISM_LENGTH;
    const pos = new THREE.Vector3(
      sx + dir.x * (h / 2),
      topY,
      sz + dir.z * (h / 2)
    );
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    return { position: pos, quaternion: q };
  }, [spawnCenter, aimYawRad]);

  return (
    <mesh
      ref={meshRef}
      position={position}
      quaternion={quaternion}
      castShadow
      receiveShadow
    >
      <cylinderGeometry
        args={[AIM_PRISM_RADIUS, AIM_PRISM_RADIUS, AIM_PRISM_LENGTH, 3]}
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
  goalCenter,
  gravityY,
  onProjectileEnd,
}: {
  meshRef: React.RefObject<THREE.Mesh | null>;
  projectileRef: React.MutableRefObject<Projectile | null>;
  spawnCenter: Vec3;
  goalCenter: Vec3;
  gravityY: number;
  onProjectileEnd: (outcome: "hit" | "miss", landing?: Vec3) => void;
}) {
  const sx = spawnCenter[0];
  const spawnTopY = spawnTopYFromBlockCenterY(spawnCenter[1]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    const p = projectileRef.current;
    if (!mesh || !p) return;

    const x0 = p.x;
    const y0 = p.y;
    const z0 = p.z;

    const dt = Math.min(delta, 0.05);
    p.vy += gravityY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    mesh.position.set(p.x, p.y, p.z);

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
  aimYawRad: number;
  cooldownUntil: number | null;
  roundLocked: boolean;
  vehicle: PlayerVehicleConfig;
  onChargeHudUpdate: (
    next: { remainingMs: number; clicks: number } | null
  ) => void;
  onShootStart: () => void;
  onProjectileEnd: (outcome: "hit" | "miss", landing?: Vec3) => void;
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
      };
      const mesh = meshRef.current;
      if (!mesh) return;
      mesh.visible = true;
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
      <group position={[...spawnCenter]}>
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
      </group>
      <AimYawPrism
        spawnCenter={spawnCenter}
        aimYawRad={aimYawRad}
        color={accentColor}
      />
      <Block center={goalCenter} color="#39b54a" />
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
        goalCenter={goalCenter}
        gravityY={vehicle.gravityY}
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
          How to play
        </h2>
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
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: hudColors.label,
              marginBottom: 8,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            Vehicles
          </div>
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
        </div>
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

function FinishGameModal({ open }: { open: boolean }) {
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
            margin: "0 0 16px",
            fontSize: 13,
            color: hudColors.muted,
            lineHeight: 1.5,
          }}
        >
          You hit the goal. More levels coming later.
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
  chargeHud,
  shotInFlight,
  cooldownUntil,
  powerupCharges,
  powerupStackCount,
  vehicle,
}: {
  spawnCenter: Vec3;
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

  const [aimYawRad, setAimYawRad] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [shotInFlight, setShotInFlight] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
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

  const onShootStart = useCallback(() => setShotInFlight(true), []);
  const onProjectileEnd = useCallback(
    (outcome: "hit" | "miss", landing?: Vec3) => {
      setShotInFlight(false);
      dispatch({
        type: "PROJECTILE_END",
        outcome,
        landing,
      });
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
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
        shadows="soft"
      >
        <CameraRig spawnCenter={game.spawnCenter} />
        <StaticSceneLights />
        <InitialFieldGround />
        <SceneContent
          spawnCenter={game.spawnCenter}
          goalCenter={goalCenter}
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
      </Canvas>
      <StatsHud
        spawnCenter={game.spawnCenter}
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
      <FinishGameModal open={showFinishModal} />
      <HelpModal
        open={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        vehicle={playerVehicle}
      />
    </div>
  );
}
