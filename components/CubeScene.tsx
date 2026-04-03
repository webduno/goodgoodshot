"use client";

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
import * as THREE from "three";

type Vec3 = readonly [number, number, number];

const BLOCK_SIZE = 1;
/**
 * Min/max distance from spawn to goal along +Z (new random value after each shot).
 * Independent of launch strength — do not tune one from the other.
 */
const GOAL_Z_MIN = 20;
const GOAL_Z_MAX = 100;

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
  };
}

function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type !== "PROJECTILE_END") return state;

  const prev = state.spawnCenter;
  let next: Vec3;
  let nextGoalWorldZ = state.goalWorldZ;

  if (action.outcome === "hit") {
    next = snapBlockCenterToGrid([
      prev[0],
      prev[1],
      state.goalWorldZ,
    ]);
    nextGoalWorldZ = next[2] + randomIntInclusive(GOAL_Z_MIN, GOAL_Z_MAX);
  } else if (action.landing) {
    next = snapBlockCenterToGrid(action.landing);
  } else {
    next = prev;
  }

  return {
    ...state,
    spawnCenter: next,
    goalWorldZ: nextGoalWorldZ,
  };
}

/** Green goal box AABB (same as the mesh: center + half extents). */
const GOAL_HALF = BLOCK_SIZE / 2;

/** Yellow lane markers between purple spawn and green goal (progress cues). */
const LANE_MARKER_COUNT_PER_SIDE = 5;
/** Distance from lane center (X) — five unit blocks to each side. */
const LANE_MARKER_SIDE_OFFSET_X = 5 * BLOCK_SIZE;
const LANE_MARKER_SIZE = 0.42;
const LANE_MARKER_COLOR = "#eab308";

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

/** 45° above horizontal in the YZ plane (toward +Z, +Y). */
const LAUNCH_ANGLE_RAD = Math.PI / 4;
/**
 * Base launch speed for the 45° direction (used when click count = 1).
 * Not derived from goal distance.
 */
const LAUNCH_STRENGTH = 8;
/**
 * How much each extra click (after the first) adds, as a fraction of LAUNCH_STRENGTH.
 * Lower = finer control (was linear ×clicks, which made 2 clicks twice as strong as 1).
 */
const CLICK_FORCE_PER_EXTRA = 0.1;
/** Gravity along −Y (scene units / s²). */
const GRAVITY = -22;

function launchStrengthFromClicks(clicks: number): number {
  const n = Math.max(1, clicks);
  return LAUNCH_STRENGTH * (1 + CLICK_FORCE_PER_EXTRA * (n - 1));
}

const CHARGE_MS = 2000;
const COOLDOWN_MS = 5000;

type Projectile = {
  y: number;
  z: number;
  vy: number;
  vz: number;
};

const BG = "#0a0a0a";

/**
 * Camera offset from spawn block center (lane stays to +X so the goal stays visible).
 */
const CAMERA_OFFSET_FROM_SPAWN: Vec3 = [0.9, 1.15, -2.35];
/** Look-at point ahead of spawn along +Z (same frame as original fixed scene). */
const LOOK_AHEAD_Z = 5;

function onCanvasCreated({ camera, gl, scene }: RootState) {
  scene.background = new THREE.Color(BG);
  gl.setClearColor(new THREE.Color(BG), 1);

  if ("fov" in camera) {
    camera.fov = 55;
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld();
}

function CameraRig({ spawnCenter }: { spawnCenter: Vec3 }) {
  const { camera } = useThree();
  const sx = spawnCenter[0];
  const sy = spawnCenter[1];
  const sz = spawnCenter[2];
  useLayoutEffect(() => {
    camera.position.set(
      sx + CAMERA_OFFSET_FROM_SPAWN[0],
      sy + CAMERA_OFFSET_FROM_SPAWN[1],
      sz + CAMERA_OFFSET_FROM_SPAWN[2]
    );
    camera.lookAt(sx, sy, sz + LOOK_AHEAD_Z);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }, [camera, sx, sy, sz]);
  return null;
}

function Block({ center, color }: { center: Vec3; color: string }) {
  return (
    <mesh position={[...center]}>
      <boxGeometry args={[BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE]} />
      {/* Unlit: visible even if lights / materials misbehave in edge environments */}
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

/**
 * Evenly spaced along +Z between spawn and goal; five markers on −X and five on +X
 * (same Z for each pair), offset from the lane by LANE_MARKER_SIDE_OFFSET_X.
 */
function laneMarkerCenters(spawnCenter: Vec3, goalCenter: Vec3): Vec3[] {
  const dz = goalCenter[2] - spawnCenter[2];
  if (dz <= 0) return [];
  const sx = spawnCenter[0];
  const sy = spawnCenter[1];
  const sz = spawnCenter[2];
  const out: Vec3[] = [];
  for (let i = 1; i <= LANE_MARKER_COUNT_PER_SIDE; i++) {
    const t = i / (LANE_MARKER_COUNT_PER_SIDE + 1);
    const z = sz + t * dz;
    out.push([sx - LANE_MARKER_SIDE_OFFSET_X, sy, z]);
    out.push([sx + LANE_MARKER_SIDE_OFFSET_X, sy, z]);
  }
  return out;
}

function SphereToGoal({
  meshRef,
  projectileRef,
  spawnCenter,
  goalCenter,
  onProjectileEnd,
}: {
  meshRef: React.RefObject<THREE.Mesh | null>;
  projectileRef: React.MutableRefObject<Projectile | null>;
  spawnCenter: Vec3;
  goalCenter: Vec3;
  onProjectileEnd: (outcome: "hit" | "miss", landing?: Vec3) => void;
}) {
  const sx = spawnCenter[0];
  const spawnTopY = spawnTopYFromBlockCenterY(spawnCenter[1]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    const p = projectileRef.current;
    if (!mesh || !p) return;

    const y0 = p.y;
    const z0 = p.z;

    const dt = Math.min(delta, 0.05);
    p.vy += GRAVITY * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    mesh.position.set(sx, p.y, p.z);

    const hitGoal = sphereIntersectsGoalBox(
      sx,
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

    let landingZ = p.z;
    if (y0 > FLOOR_CONTACT_CENTER_Y && p.y !== y0) {
      const t =
        (FLOOR_CONTACT_CENTER_Y - y0) / (p.y - y0);
      landingZ = z0 + t * (p.z - z0);
    }

    projectileRef.current = null;
    mesh.visible = false;
    /** Raw block center on ground; parent snaps to integer grid. */
    onProjectileEnd("miss", [sx, spawnCenter[1], landingZ]);
  });

  return (
    <mesh
      ref={meshRef}
      position={[sx, spawnTopY, spawnCenter[2]]}
      visible={false}
    >
      <sphereGeometry args={[SPHERE_RADIUS, 24, 24]} />
      <meshBasicMaterial color="#e4e4e7" />
    </mesh>
  );
}

function SceneContent({
  spawnCenter,
  goalCenter,
  cooldownUntil,
  roundLocked,
  onChargeHudUpdate,
  onShootStart,
  onProjectileEnd,
}: {
  spawnCenter: Vec3;
  goalCenter: Vec3;
  cooldownUntil: number | null;
  roundLocked: boolean;
  onChargeHudUpdate: (
    next: { remainingMs: number; clicks: number } | null
  ) => void;
  onShootStart: () => void;
  onProjectileEnd: (outcome: "hit" | "miss", landing?: Vec3) => void;
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
      const force = launchStrengthFromClicks(clicks);
      const vz = force * Math.cos(LAUNCH_ANGLE_RAD);
      const vy = force * Math.sin(LAUNCH_ANGLE_RAD);
      const topY = spawnTopYFromBlockCenterY(spawnCenter[1]);
      const topZ = spawnCenter[2];
      projectileRef.current = {
        y: topY,
        z: topZ,
        vy,
        vz,
      };
      const mesh = meshRef.current;
      if (!mesh) return;
      mesh.visible = true;
      mesh.position.set(spawnCenter[0], topY, topZ);
      onShootStart();
    },
    [onShootStart, spawnCenter]
  );

  const beginChargeWindow = useCallback(() => {
    if (chargeTimerRef.current) clearTimeout(chargeTimerRef.current);
    if (chargeTickRef.current) clearInterval(chargeTickRef.current);

    clickCountRef.current = 1;
    chargingRef.current = true;
    chargeEndsAtRef.current = performance.now() + CHARGE_MS;
    onChargeHudUpdate({
      remainingMs: CHARGE_MS,
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
    }, CHARGE_MS);
  }, [fireProjectile, onChargeHudUpdate]);

  const yellowLaneMarkers = useMemo(
    () => laneMarkerCenters(spawnCenter, goalCenter),
    [spawnCenter, goalCenter]
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

  return (
    <>
      <mesh
        position={[...spawnCenter]}
        onPointerDown={onSpawnPointerDown}
      >
        <boxGeometry args={[BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE]} />
        <meshBasicMaterial color="#6366f1" />
      </mesh>
      <Block center={goalCenter} color="#22c55e" />
      {yellowLaneMarkers.map((center) => (
        <mesh key={`lane-${center[0]}-${center[2]}`} position={[...center]}>
          <boxGeometry
            args={[LANE_MARKER_SIZE, LANE_MARKER_SIZE, LANE_MARKER_SIZE]}
          />
          <meshBasicMaterial color={LANE_MARKER_COLOR} />
        </mesh>
      ))}
      <SphereToGoal
        meshRef={meshRef}
        projectileRef={projectileRef}
        spawnCenter={spawnCenter}
        goalCenter={goalCenter}
        onProjectileEnd={onProjectileEnd}
      />
    </>
  );
}

function FinishGameModal({ open }: { open: boolean }) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="finish-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.65)",
        pointerEvents: "auto",
      }}
    >
      <div
        style={{
          maxWidth: 360,
          width: "min(90vw, 360px)",
          padding: "28px 24px",
          borderRadius: 12,
          background: "#18181b",
          border: "1px solid #3f3f46",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <h2
          id="finish-title"
          style={{
            margin: "0 0 8px",
            fontSize: 20,
            fontWeight: 600,
            color: "#fafafa",
          }}
        >
          Level complete
        </h2>
        <p style={{ margin: "0 0 22px", fontSize: 14, color: "#a1a1aa", lineHeight: 1.5 }}>
          You hit the goal. More levels coming later.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            width: "100%",
            padding: "12px 16px",
            fontSize: 15,
            fontWeight: 500,
            color: "#fafafa",
            background: "#22c55e",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
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

function PositionHud({ spawnCenter }: { spawnCenter: Vec3 }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        zIndex: 40,
        pointerEvents: "none",
        userSelect: "none",
        padding: "10px 12px",
        borderRadius: 8,
        background: "rgba(24, 24, 27, 0.92)",
        border: "1px solid #3f3f46",
        fontFamily:
          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 11,
        lineHeight: 1.45,
        color: "#d4d4d8",
      }}
    >
      <div style={{ color: "#71717a", marginBottom: 4, fontSize: 10 }}>
        Position
      </div>
      <div>
        ({formatVec3(spawnCenter)})
      </div>
    </div>
  );
}

function ShotHud({
  shotInFlight,
  cooldownUntil,
  chargeHud,
}: {
  shotInFlight: boolean;
  cooldownUntil: number | null;
  chargeHud: { remainingMs: number; clicks: number } | null;
}) {
  const remainingMs =
    cooldownUntil !== null ? Math.max(0, cooldownUntil - Date.now()) : 0;
  const inCooldown = cooldownUntil !== null && remainingMs > 0;
  const progress =
    inCooldown && COOLDOWN_MS > 0 ? remainingMs / COOLDOWN_MS : 0;
  const charging = chargeHud !== null;
  const chargeProgress =
    charging && CHARGE_MS > 0 ? chargeHud.remainingMs / CHARGE_MS : 0;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 28,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        pointerEvents: "none",
        userSelect: "none",
        fontFamily: "system-ui, sans-serif",
        fontSize: 14,
        color: "#a1a1aa",
      }}
    >
      {charging && !shotInFlight && chargeHud && (
        <>
          <span>
            Power window —{" "}
            <strong style={{ color: "#e4e4e7", fontVariantNumeric: "tabular-nums" }}>
              {(chargeHud.remainingMs / 1000).toFixed(1)}
            </strong>
            s ·{" "}
            <strong style={{ color: "#a78bfa" }}>{chargeHud.clicks}</strong>{" "}
            {chargeHud.clicks === 1 ? "click" : "clicks"}
          </span>
          <span style={{ fontSize: 12, opacity: 0.85 }}>
            Power {launchStrengthFromClicks(chargeHud.clicks).toFixed(2)} speed
            {" "}
            <span style={{ opacity: 0.75 }}>
              (+{Math.round(CLICK_FORCE_PER_EXTRA * 100)}% per extra click)
            </span>
          </span>
          <div
            style={{
              width: 200,
              height: 4,
              borderRadius: 2,
              background: "#27272a",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${chargeProgress * 100}%`,
                height: "100%",
                background: "#a78bfa",
                transition: "width 0.05s linear",
              }}
            />
          </div>
        </>
      )}
      {shotInFlight && (
        <span style={{ letterSpacing: "0.02em" }}>Shot in flight…</span>
      )}
      {inCooldown && !shotInFlight && !charging && (
        <>
          <span>
            Next shot in{" "}
            <strong style={{ color: "#e4e4e7", fontVariantNumeric: "tabular-nums" }}>
              {(remainingMs / 1000).toFixed(1)}
            </strong>
            s
          </span>
          <div
            style={{
              width: 200,
              height: 4,
              borderRadius: 2,
              background: "#27272a",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress * 100}%`,
                height: "100%",
                background: "#6366f1",
                transition: "width 0.1s linear",
              }}
            />
          </div>
        </>
      )}
      {!shotInFlight && !inCooldown && !charging && (
        <span style={{ opacity: 0.75 }}>
          Ready — first click starts a {CHARGE_MS / 1000}s power window
        </span>
      )}
    </div>
  );
}

export default function CubeScene() {
  const [game, dispatch] = useReducer(
    gameReducer,
    undefined,
    createInitialGameState
  );

  const goalCenter: Vec3 = [
    game.spawnCenter[0],
    game.spawnCenter[1],
    game.goalWorldZ,
  ];

  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [shotInFlight, setShotInFlight] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [chargeHud, setChargeHud] = useState<{
    remainingMs: number;
    clicks: number;
  } | null>(null);
  const [, setHudTick] = useState(0);

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
      setCooldownUntil(performance.now() + COOLDOWN_MS);
    },
    []
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
      >
        <CameraRig spawnCenter={game.spawnCenter} />
        <SceneContent
          spawnCenter={game.spawnCenter}
          goalCenter={goalCenter}
          cooldownUntil={cooldownUntil}
          roundLocked={showFinishModal}
          onChargeHudUpdate={onChargeHudUpdate}
          onShootStart={onShootStart}
          onProjectileEnd={onProjectileEnd}
        />
      </Canvas>
      <PositionHud spawnCenter={game.spawnCenter} />
      {!showFinishModal && (
        <ShotHud
          shotInFlight={shotInFlight}
          cooldownUntil={cooldownUntil}
          chargeHud={chargeHud}
        />
      )}
      <FinishGameModal open={showFinishModal} />
    </div>
  );
}
