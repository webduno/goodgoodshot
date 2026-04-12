"use client";
import {
  launchStrengthFromClicks,
  rgbTupleToCss,
  vehicleChargeMs,
  type PlayerVehicleConfig,
} from "@/components/playerVehicleConfig";
import { PvpOpponentVehicle } from "@/components/game/cube/meshes/PvpOpponentVehicle";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
} from "react";
import * as THREE from "three";

import { Block } from "@/components/game/cube/meshes/Block";
import { GoalCageDecor } from "@/components/game/cube/meshes/GoalCageDecor";
import { GoalMessengerCharacter } from "@/components/game/cube/meshes/GoalMessengerCharacter";
import { AimYawPrism } from "@/components/game/cube/meshes/AimYawPrism";
import { SpawnTeePad } from "@/components/game/cube/meshes/SpawnTeePad";
import { TeeCornerTree } from "@/components/game/cube/meshes/TeeCornerTree";
import { TeeHoleSign } from "@/components/game/cube/meshes/TeeHoleSign";
import { ShootTriggerCube } from "@/components/game/cube/meshes/ShootTriggerCube";
import { VehicleBodyParts } from "@/components/game/cube/meshes/VehicleBodyParts";
import { VehicleCornerBlock } from "@/components/game/cube/meshes/VehicleCornerBlock";
import { VehicleGlassHat } from "@/components/game/cube/meshes/VehicleGlassHat";
import { VehicleOrbitingFish } from "@/components/game/cube/meshes/VehicleOrbitingFish";
import { VehicleObjMesh } from "@/components/game/cube/meshes/VehicleObjMesh";
import {
  VehiclePowerupBurst,
  type VehiclePowerupBurstSlot,
} from "@/components/game/cube/meshes/VehiclePowerupBurst";
import { SphereToGoal } from "@/components/game/cube/SphereToGoal";
import {
  type BallFollowStateRef,
  SpawnVisualGroup,
} from "@/components/game/cube/TeleportOrbitRig";
import {
  BLOCK_SIZE,
  CHARGE_HOLD_REPEAT_MS,
  FIELD_PLANE_HALF_WIDTH_X,
  FIELD_PLANE_Z_BEFORE_SPAWN,
  FIELD_PLANE_Z_PAST_GOAL,
  GOAL_Z_MAX,
  TURF_TOP_Y,
  VEHICLE_CORNER_BLOCK_SIZE,
  VEHICLE_WHEEL_FLOOR_Y_EPS,
  VEHICLE_WHEEL_OUTWARD,
} from "@/lib/game/constants";
import {
  aimPrismLengthForStrength,
  bodyYawQuarterSnappedFromWorldAim,
  hudAimYawToWorldYawRad,
  spawnTopYFromBlockCenterY,
} from "@/lib/game/math";
import {
  EMPTY_MAP_CAGES_BROKEN,
  mapCageKey,
  NO_MAP_CAGES,
} from "@/lib/game/mapCages";
import { coinCellKey, coinCentersForIslands } from "@/lib/game/path";
import {
  goalEnemySpawnOffsetXZ,
} from "@/lib/game/goalEnemyPlacement";
import type { IslandRect } from "@/lib/game/islands";
import {
  INITIAL_LANE_ORIGIN,
  type BiomeId,
  type GoalEnemySpec,
  type Projectile,
  type Vec3,
} from "@/lib/game/types";
import { TerrainTextured } from "../TerrainTextured";
import type { FishId, HatId } from "@/lib/shop/playerInventory";
import { PowerupHudIcon } from "@/components/game/cube/hud/PowerupHudIcon";
import { POWERUP_SLOT_ACCENT } from "@/components/gameHudStyles";
import { EarthTextured } from "../EarthTextured";
import { ShotGuidelineArc } from "@/components/game/cube/ShotGuidelineArc";
import { sampleFirstSegmentGuideline } from "@/lib/game/firstSegmentGuideline";
import { playSfx, SFX } from "@/lib/sfx/sfxPlayer";
import type { PvpShotBroadcastPayload } from "@/lib/pvp/shotBroadcast";

/** Local Y above spawn block center: clears default hull top (~0.5) and typical barrel. */
const VEHICLE_POWERUP_LABEL_Y = 0.92;

const ENEMY_LOSS_SINK_DURATION_SEC = 2;
const ENEMY_LOSS_SINK_BLOCKS = 2;

/**
 * Drei `Html` defaults to `zIndexRange` [16777271, 0], so labels paint above fixed UI (e.g. modals at
 * z-index 50). Keep world-space HTML strictly below overlays (`modalBackdrop` 50; HUD toasts 70).
 */
const VEHICLE_HTML_Z_INDEX_RANGE: [number, number] = [35, 0];

function pillStyle(
  slot: "strength" | "noBounce" | "nowind"
): CSSProperties {
  const a = POWERUP_SLOT_ACCENT[slot];
  const text =
    slot === "strength"
      ? "#7c2d12"
      : slot === "noBounce"
        ? "#4c1d95"
        : "#0c4a5e";
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    padding: "0 6px",
    height: 18,
    borderRadius: 999,
    fontSize: 9,
    fontWeight: 700,
    color: text,
    textShadow: "0 1px 0 rgba(255,255,255,0.45)",
    background: a.ready,
    border: "1px solid rgba(255,255,255,0.88)",
    boxShadow: a.shadow,
    whiteSpace: "nowrap",
  };
}

function VehicleNextShotPowerupLabel({
  powerupStackCount,
  noBounceActive,
  noWindActive,
}: {
  powerupStackCount: number;
  noBounceActive: boolean;
  noWindActive: boolean;
}) {
  const hasAny =
    powerupStackCount > 0 || noBounceActive || noWindActive;
  if (!hasAny) return null;

  const strengthMult = Math.pow(2, powerupStackCount);

  return (
    <Html
      position={[0, VEHICLE_POWERUP_LABEL_Y, 0]}
      center
      distanceFactor={7}
      zIndexRange={VEHICLE_HTML_Z_INDEX_RANGE}
      style={{ pointerEvents: "none", userSelect: "none" }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          maxWidth: 190,
        }}
      >
        <span
          style={{
            fontSize: 9,
            fontWeight: 600,
            color: "rgba(15, 23, 42, 0.72)",
            letterSpacing: "0.02em",
          }}
        >
          Next shot
        </span>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
            justifyContent: "center",
          }}
        >
          {powerupStackCount > 0 && (
            <span style={pillStyle("strength")}>
              <PowerupHudIcon slotId="strength" color="currentColor" size={11} />
              ×{strengthMult}
            </span>
          )}
          {noBounceActive && (
            <span style={pillStyle("noBounce")}>
              <PowerupHudIcon slotId="noBounce" color="currentColor" size={11} />
              No bounce
            </span>
          )}
          {noWindActive && (
            <span style={pillStyle("nowind")}>
              <PowerupHudIcon slotId="nowind" color="currentColor" size={11} />
              No wind
            </span>
          )}
        </div>
      </div>
    </Html>
  );
}

function LaneCoin({ position }: { position: Vec3 }) {
  const spinRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    // After parent R_x(π/2), local Y → world Z; use Z so spin is around world Y (horizontal plane).
    if (spinRef.current) spinRef.current.rotation.z += delta * 5;
  });
  return (
    <group position={[...position]}>
      {/** Y-up cylinder → rotate so axis is horizontal: coin stands on edge (vertical faces). */}
      <group rotation={[Math.PI / 2, 0, 0]}>
        <group ref={spinRef}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.42, 0.42, 0.07, 12]} />
            <meshStandardMaterial
              color="#f5dc6a"
              emissive="#c9a030"
              emissiveIntensity={0.22}
              roughness={0.32}
              metalness={0.82}
            />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export function SceneContent({
  spawnCenter,
  goalCenter,
  islands,
  aimYawRad,
  aimPitchOffsetRad,
  cooldownUntil,
  roundLocked,
  shotInFlight,
  vehicle,
  onChargeHudUpdate,
  onShootStart,
  onProjectileEnd,
  getPowerupMultiplier,
  getNoBounceActive,
  prepareShotWind,
  resetPowerupStack,
  onChargeWindowStart,
  collectedCoinKeysRef,
  coinRenderTick,
  onCoinCollected,
  onBindFireHeld,
  onBindGuidelineShoot,
  isCharging,
  powerupStackCount,
  noBounceActive,
  noWindActive,
  guidelineActiveNextShot,
  onGuidelineConsumedForShot,
  chargeHudForGuideline,
  guidelinePreviewClicks,
  guidelineFireBlocked,
  biome,
  onTerrainCoordsClick,
  ballFollowStateRef,
  goalEnemies,
  /** Hub / town: no tee, goal block, lane coins, or messengers — only vehicle + ball on islands. */
  hubMode = false,
  /** PvP: hide green goal block; opponent is the goal messenger(s). */
  pvpMode = false,
  /** PvP: full vehicle mesh at goal instead of walking messenger. */
  pvpOpponentVehicle = null,
  /** PvP: opponent world position (from server; updates when their turn ends). */
  pvpOpponentWorldPos = null,
  /** PvP: local spawn — opponent hull faces this point. */
  pvpOpponentFacingToward = null,
  /** PvE race: ghost opponent at their tee (no ball contact — `goalEnemies` empty). */
  pveOpponentVehicle = null,
  pveOpponentWorldPos = null,
  pveOpponentFacingToward = null,
  onEnemyLossAnimatingChange,
  equippedHatId = null,
  equippedFishId = null,
  mapCages = NO_MAP_CAGES,
  goalCagesBroken = EMPTY_MAP_CAGES_BROKEN,
  cageEscapeNextShot = false,
  onCageTrapped,
  onBreakGoalCageFromShot,
  powerupVehicleBurstSeq = 0,
  powerupVehicleBurstSlot = "strength",
  broadcastUserId = null,
  onBroadcastLocalShot,
  remoteGhostShotPayload = null,
  onRemoteGhostShotConsumed,
}: {
  spawnCenter: Vec3;
  goalCenter: Vec3;
  islands: readonly IslandRect[];
  biome: BiomeId;
  goalEnemies: readonly GoalEnemySpec[];
  hubMode?: boolean;
  pvpMode?: boolean;
  pvpOpponentVehicle?: PlayerVehicleConfig | null;
  pvpOpponentWorldPos?: Vec3 | null;
  pvpOpponentFacingToward?: Vec3 | null;
  /** PvE: show other player’s vehicle without collision (parallel race). */
  pveOpponentVehicle?: PlayerVehicleConfig | null;
  pveOpponentWorldPos?: Vec3 | null;
  pveOpponentFacingToward?: Vec3 | null;
  /** HUD ring yaw (atan2(dx, −dy)); converted to world XZ for shot, prism, and hull snap. */
  aimYawRad: number;
  /** Radians added to `vehicle.launchAngleRad` for this shot (clamped ±15° in UI). */
  aimPitchOffsetRad: number;
  cooldownUntil: number | null;
  roundLocked: boolean;
  shotInFlight: boolean;
  /** True while the charge window is open (after first Fire tap). */
  isCharging: boolean;
  vehicle: PlayerVehicleConfig;
  onChargeHudUpdate: (
    next: { remainingMs: number; clicks: number } | null
  ) => void;
  onShootStart: () => void;
  onProjectileEnd: (
    outcome: "hit" | "miss" | "penalty" | "enemy_loss" | "enemy_kill",
    landing?: Vec3
  ) => void;
  getPowerupMultiplier: () => number;
  getNoBounceActive: () => boolean;
  /** Advances wind for this shot and returns horizontal acceleration (XZ) for the ball. */
  prepareShotWind: () => { ax: number; az: number };
  resetPowerupStack: () => void;
  onChargeWindowStart?: () => void;
  collectedCoinKeysRef: MutableRefObject<Set<string>>;
  /** Bumps when a coin is collected or the hole goal changes (re-render visibility). */
  coinRenderTick: number;
  onCoinCollected: (key: string) => void;
  /** Press/release for fire + hold-to-add-power (Fire button, Space, rear red cube). */
  onBindFireHeld: (handler: ((held: boolean) => void) | null) => void;
  /** Guideline mode: fire at the slider click count (Shoot button). */
  onBindGuidelineShoot?: (handler: (() => void) | null) => void;
  /** Queued strength stacks (2^count multiplier) for the next shot. */
  powerupStackCount: number;
  noBounceActive: boolean;
  noWindActive: boolean;
  /** True after activating Guideline until that shot is fired. */
  guidelineActiveNextShot: boolean;
  /** Clears guideline state when the ball is launched (next shot only). */
  onGuidelineConsumedForShot: () => void;
  /**
   * While charging: live clicks. When null but guideline is armed: preview uses
   * `guidelinePreviewClicks` (slider value until Shoot fires).
   */
  chargeHudForGuideline: { clicks: number } | null;
  /** Guideline preview / Shoot: click count (1 … ref bar max). */
  guidelinePreviewClicks: number;
  /** True while adjusting guideline: shoot controls do not start a charge. */
  guidelineFireBlocked: boolean;
  /** Earth / terrain mesh pick: parent can show HUD toast (e.g. coordinates). */
  onTerrainCoordsClick?: (coords: { lat: number; lng: number }) => void;
  ballFollowStateRef: BallFollowStateRef;
  /** While the enemy-touch sink plays, parent should lock HUD / keyboard aim. */
  onEnemyLossAnimatingChange?: (active: boolean) => void;
  /** Cosmetic glass hat from the plaza shop (local player). */
  equippedHatId?: HatId | null;
  /** Cosmetic fish orbiting the vehicle (plaza shop; at most one). */
  equippedFishId?: FishId | null;
  /** Trap dome positions for this hole (course only). */
  mapCages?: readonly Vec3[];
  /** Cage keys already broken this hole (course only). */
  goalCagesBroken?: ReadonlySet<string>;
  /** After landing in an intact corner cage, next launch uses 15% strength and breaks that cage. */
  cageEscapeNextShot?: boolean;
  onCageTrapped?: () => void;
  onBreakGoalCageFromShot?: (cellKey: string) => void;
  /** Bump when the local player uses a consumable power-up (strength / no bounce / no wind). */
  powerupVehicleBurstSeq?: number;
  powerupVehicleBurstSlot?: VehiclePowerupBurstSlot;
  /** PvP/PvE online: local user id — used to ignore own broadcast echo and to tag outgoing shots. */
  broadcastUserId?: string | null;
  onBroadcastLocalShot?: (payload: PvpShotBroadcastPayload) => void;
  remoteGhostShotPayload?: PvpShotBroadcastPayload | null;
  onRemoteGhostShotConsumed?: () => void;
}) {
  const mapCagesRef = useRef(mapCages);
  mapCagesRef.current = mapCages;
  const goalCagesBrokenRef = useRef(goalCagesBroken);
  goalCagesBrokenRef.current = goalCagesBroken;

  const meshRef = useRef<THREE.Mesh>(null);
  const projectileRef = useRef<Projectile | null>(null);
  const ghostMeshRef = useRef<THREE.Mesh>(null);
  const ghostProjectileRef = useRef<Projectile | null>(null);
  const ghostShotWindAccelRef = useRef({ x: 0, z: 0 });
  const ghostCollectedCoinKeysRef = useRef(new Set<string>());
  const shotWindAccelRef = useRef({ x: 0, z: 0 });
  const [ghostSpawnCenter, setGhostSpawnCenter] = useState<Vec3 | null>(null);
  const [ghostSpawnKey, setGhostSpawnKey] = useState(0);
  const chargingRef = useRef(false);
  const clickCountRef = useRef(1);
  const chargeEndsAtRef = useRef(0);
  const chargeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chargeTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chargeHoldRepeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Counts simultaneous press sources (pointer + Space) so hold repeat stops only when all release. */
  const fireHeldPressCountRef = useRef(0);

  const enemyLossSinkGroupRef = useRef<THREE.Group>(null);
  const enemyLossSinkActiveRef = useRef(false);
  const enemyLossSinkProgressRef = useRef(0);
  const enemyLossEndDispatchedRef = useRef(false);
  const onProjectileEndRef = useRef(onProjectileEnd);
  onProjectileEndRef.current = onProjectileEnd;
  const onEnemyLossAnimatingChangeRef = useRef(onEnemyLossAnimatingChange);
  onEnemyLossAnimatingChangeRef.current = onEnemyLossAnimatingChange;

  const [enemyAliveMask, setEnemyAliveMask] = useState<boolean[]>(() =>
    Array.from({ length: goalEnemies.length }, () => true)
  );
  const enemySimRef = useRef<{
    positions: { x: number; y: number; z: number }[];
    alive: boolean[];
  }>({ positions: [], alive: [] });

  useLayoutEffect(() => {
    const n = goalEnemies.length;
    enemySimRef.current.positions = Array.from({ length: n }, () => ({
      x: 0,
      y: TURF_TOP_Y + 0.2,
      z: 0,
    }));
    enemySimRef.current.alive = Array.from({ length: n }, () => true);
    setEnemyAliveMask(Array.from({ length: n }, () => true));
  }, [goalCenter[0], goalCenter[2], goalEnemies.length]);

  const onEnemyHitByBall = useCallback((index: number) => {
    if (!enemySimRef.current.alive[index]) return;
    enemySimRef.current.alive[index] = false;
    setEnemyAliveMask((prev) => {
      if (!prev[index]) return prev;
      const next = [...prev];
      next[index] = false;
      return next;
    });
    playSfx(SFX.enemyKill);
  }, []);

  /** Ghost ball: do not mutate local enemy-alive state (server is source of truth). */
  const ghostEnemyHitNoop = useCallback(() => {}, []);

  useEffect(() => {
    return () => {
      if (chargeTimerRef.current) clearTimeout(chargeTimerRef.current);
      if (chargeTickRef.current) clearInterval(chargeTickRef.current);
      if (chargeHoldRepeatRef.current) clearInterval(chargeHoldRepeatRef.current);
    };
  }, []);

  const worldAimYawRad = useMemo(
    () => hudAimYawToWorldYawRad(aimYawRad),
    [aimYawRad]
  );

  const guidelinePoints = useMemo(() => {
    if (!guidelineActiveNextShot || shotInFlight) {
      return [];
    }
    const charging = chargeHudForGuideline !== null;
    const clicks = charging
      ? chargeHudForGuideline.clicks
      : guidelinePreviewClicks;
    let force =
      launchStrengthFromClicks(clicks, vehicle) * getPowerupMultiplier();
    if (cageEscapeNextShot) force *= 0.15;
    return sampleFirstSegmentGuideline(
      spawnCenter,
      goalCenter,
      vehicle.gravityY,
      worldAimYawRad,
      aimPitchOffsetRad,
      vehicle.launchAngleRad,
      force
    );
  }, [
    aimPitchOffsetRad,
    chargeHudForGuideline,
    guidelinePreviewClicks,
    getPowerupMultiplier,
    goalCenter,
    guidelineActiveNextShot,
    shotInFlight,
    spawnCenter,
    vehicle,
    worldAimYawRad,
    cageEscapeNextShot,
  ]);

  const fireProjectile = useCallback(
    (clicks: number) => {
      onGuidelineConsumedForShot();
      const w = prepareShotWind();
      shotWindAccelRef.current = { x: w.ax, z: w.az };
      const noBounceShot = getNoBounceActive();
      const powerMulBeforeReset = getPowerupMultiplier();
      let force =
        launchStrengthFromClicks(clicks, vehicle) * powerMulBeforeReset;
      if (cageEscapeNextShot) {
        force *= 0.15;
        onBreakGoalCageFromShot?.(
          mapCageKey(spawnCenter[0], spawnCenter[2])
        );
      }
      resetPowerupStack();
      const launchAngleRad = vehicle.launchAngleRad + aimPitchOffsetRad;
      const horizontalMag = force * Math.cos(launchAngleRad);
      const vy = force * Math.sin(launchAngleRad);
      const topY = spawnTopYFromBlockCenterY(spawnCenter[1]);
      const topZ = spawnCenter[2];
      const topX = spawnCenter[0];
      projectileRef.current = {
        x: topX,
        y: topY,
        z: topZ,
        vx: horizontalMag * Math.sin(worldAimYawRad),
        vy,
        vz: horizontalMag * Math.cos(worldAimYawRad),
        bouncesRemaining: noBounceShot ? 0 : vehicle.landingBounces,
        rolling: false,
        allowRoll: !noBounceShot,
      };
      const mesh = meshRef.current;
      if (!mesh) return;
      mesh.visible = true;
      mesh.rotation.set(0, 0, 0);
      mesh.position.set(topX, topY, topZ);
      playSfx(SFX.shoot);
      onShootStart();
      if (onBroadcastLocalShot && broadcastUserId) {
        onBroadcastLocalShot({
          senderId: broadcastUserId,
          spawn: [topX, spawnCenter[1], topZ],
          clicks,
          worldAimYawRad,
          aimPitchOffsetRad,
          powerMultiplier: powerMulBeforeReset,
          noBounce: noBounceShot,
          windAx: shotWindAccelRef.current.x,
          windAz: shotWindAccelRef.current.z,
        });
      }
    },
    [
      aimPitchOffsetRad,
      worldAimYawRad,
      broadcastUserId,
      getNoBounceActive,
      getPowerupMultiplier,
      onBroadcastLocalShot,
      onGuidelineConsumedForShot,
      onShootStart,
      prepareShotWind,
      resetPowerupStack,
      spawnCenter,
      vehicle,
      cageEscapeNextShot,
      onBreakGoalCageFromShot,
    ]
  );

  const fireGhostProjectile = useCallback(
    (payload: PvpShotBroadcastPayload, ghostVehicle: PlayerVehicleConfig) => {
      ghostShotWindAccelRef.current = { x: payload.windAx, z: payload.windAz };
      const spawn = payload.spawn;
      const launchAngleRad =
        ghostVehicle.launchAngleRad + payload.aimPitchOffsetRad;
      const force =
        launchStrengthFromClicks(payload.clicks, ghostVehicle) *
        payload.powerMultiplier;
      const horizontalMag = force * Math.cos(launchAngleRad);
      const vy = force * Math.sin(launchAngleRad);
      const topY = spawnTopYFromBlockCenterY(spawn[1]);
      const topX = spawn[0];
      const topZ = spawn[2];
      ghostProjectileRef.current = {
        x: topX,
        y: topY,
        z: topZ,
        vx: horizontalMag * Math.sin(payload.worldAimYawRad),
        vy,
        vz: horizontalMag * Math.cos(payload.worldAimYawRad),
        bouncesRemaining: payload.noBounce ? 0 : ghostVehicle.landingBounces,
        rolling: false,
        allowRoll: !payload.noBounce,
      };
      setGhostSpawnCenter(spawn);
      setGhostSpawnKey((k) => k + 1);
    },
    []
  );

  const onGhostProjectileEnd = useCallback(
    (
      _outcome: "hit" | "miss" | "penalty" | "enemy_loss" | "enemy_kill",
      _landing?: Vec3
    ) => {
      ghostProjectileRef.current = null;
      setGhostSpawnCenter(null);
    },
    []
  );

  useEffect(() => {
    if (!remoteGhostShotPayload) return;
    if (
      broadcastUserId &&
      remoteGhostShotPayload.senderId === broadcastUserId
    ) {
      onRemoteGhostShotConsumed?.();
      return;
    }
    const ghostVehicle = pvpOpponentVehicle ?? pveOpponentVehicle;
    if (!ghostVehicle) {
      onRemoteGhostShotConsumed?.();
      return;
    }
    fireGhostProjectile(remoteGhostShotPayload, ghostVehicle);
    onRemoteGhostShotConsumed?.();
  }, [
    remoteGhostShotPayload,
    broadcastUserId,
    pvpOpponentVehicle,
    pveOpponentVehicle,
    fireGhostProjectile,
    onRemoteGhostShotConsumed,
  ]);

  const tryFireGuidelineDirect = useCallback(() => {
    if (roundLocked) return;
    if (cooldownUntil !== null && Date.now() < cooldownUntil) return;
    if (projectileRef.current) return;
    if (!guidelineFireBlocked) return;
    if (chargingRef.current) return;
    fireProjectile(guidelinePreviewClicks);
  }, [
    roundLocked,
    cooldownUntil,
    guidelineFireBlocked,
    guidelinePreviewClicks,
    fireProjectile,
  ]);

  useEffect(() => {
    onBindGuidelineShoot?.(tryFireGuidelineDirect);
    return () => onBindGuidelineShoot?.(null);
  }, [onBindGuidelineShoot, tryFireGuidelineDirect]);

  const beginChargeWindow = useCallback(() => {
    const chargeMs = vehicleChargeMs(vehicle);
    if (chargeTimerRef.current) clearTimeout(chargeTimerRef.current);
    if (chargeTickRef.current) clearInterval(chargeTickRef.current);

    onChargeWindowStart?.();

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
      fireHeldPressCountRef.current = 0;
      if (chargeHoldRepeatRef.current) {
        clearInterval(chargeHoldRepeatRef.current);
        chargeHoldRepeatRef.current = null;
      }

      const n = clickCountRef.current;
      onChargeHudUpdate(null);
      fireProjectile(n);
    }, chargeMs);
  }, [fireProjectile, onChargeHudUpdate, onChargeWindowStart, vehicle]);

  const bumpChargeClicks = useCallback(() => {
    if (!chargingRef.current) return;
    clickCountRef.current += 1;
    onChargeHudUpdate({
      remainingMs: Math.max(0, chargeEndsAtRef.current - performance.now()),
      clicks: clickCountRef.current,
    });
  }, [onChargeHudUpdate]);

  const clearChargeHoldRepeat = useCallback(() => {
    if (chargeHoldRepeatRef.current) {
      clearInterval(chargeHoldRepeatRef.current);
      chargeHoldRepeatRef.current = null;
    }
  }, []);

  const cancelActiveChargeWindow = useCallback(() => {
    if (chargeTimerRef.current) {
      clearTimeout(chargeTimerRef.current);
      chargeTimerRef.current = null;
    }
    if (chargeTickRef.current) {
      clearInterval(chargeTickRef.current);
      chargeTickRef.current = null;
    }
    if (chargeHoldRepeatRef.current) {
      clearInterval(chargeHoldRepeatRef.current);
      chargeHoldRepeatRef.current = null;
    }
    chargingRef.current = false;
    fireHeldPressCountRef.current = 0;
    onChargeHudUpdate(null);
  }, [onChargeHudUpdate]);

  const onEnemyReachedVehicle = useCallback(() => {
    cancelActiveChargeWindow();
    const p = projectileRef.current;
    if (p) {
      projectileRef.current = null;
      const mesh = meshRef.current;
      if (mesh) mesh.visible = false;
    }
    enemyLossSinkProgressRef.current = 0;
    enemyLossEndDispatchedRef.current = false;
    enemyLossSinkActiveRef.current = true;
    if (enemyLossSinkGroupRef.current) {
      enemyLossSinkGroupRef.current.position.y = 0;
    }
    onEnemyLossAnimatingChangeRef.current?.(true);
  }, [cancelActiveChargeWindow]);

  const yellowLaneMarkers = useMemo(
    () =>
      hubMode
        ? []
        : coinCentersForIslands(islands, INITIAL_LANE_ORIGIN[1], goalCenter),
    [islands, hubMode, goalCenter]
  );

  const goalLength = useMemo(() => {
    const dx = goalCenter[0] - spawnCenter[0];
    const dz = goalCenter[2] - spawnCenter[2];
    return Math.hypot(dx, dz);
  }, [goalCenter, spawnCenter]);

  void coinRenderTick;

  useFrame((_, delta) => {
    const ghostMesh = ghostMeshRef.current;
    const gp = ghostProjectileRef.current;
    const mesh = meshRef.current;
    const p = projectileRef.current;
    const st = ballFollowStateRef.current;
    if (ghostMesh && gp) {
      st.pos.copy(ghostMesh.position);
      st.valid = true;
      st.vx = gp.vx;
      st.vy = gp.vy;
      st.vz = gp.vz;
    } else if (mesh && p) {
      st.pos.copy(mesh.position);
      st.valid = true;
      st.vx = p.vx;
      st.vy = p.vy;
      st.vz = p.vz;
    } else {
      st.valid = false;
      st.vx = 0;
      st.vy = 0;
      st.vz = 0;
    }

    if (enemyLossSinkActiveRef.current) {
      enemyLossSinkProgressRef.current += delta / ENEMY_LOSS_SINK_DURATION_SEC;
      const rawT = Math.min(1, enemyLossSinkProgressRef.current);
      const easeT = rawT * rawT * (3 - 2 * rawT);
      const y = -ENEMY_LOSS_SINK_BLOCKS * BLOCK_SIZE * easeT;
      const g = enemyLossSinkGroupRef.current;
      if (g) g.position.y = y;
      if (rawT >= 1 && !enemyLossEndDispatchedRef.current) {
        enemyLossEndDispatchedRef.current = true;
        enemyLossSinkActiveRef.current = false;
        onProjectileEndRef.current("enemy_loss");
        onEnemyLossAnimatingChangeRef.current?.(false);
      }
    }
  }, -1);

  const onFireInput = useCallback(() => {
    if (roundLocked) return;
    if (cooldownUntil !== null && Date.now() < cooldownUntil) return;
    if (projectileRef.current) return;
    if (guidelineFireBlocked) return;

    if (chargingRef.current) {
      bumpChargeClicks();
      return;
    }

    beginChargeWindow();
  },
    [
      roundLocked,
      cooldownUntil,
      beginChargeWindow,
      bumpChargeClicks,
      onChargeHudUpdate,
      guidelineFireBlocked,
    ]
  );

  const setFireHeld = useCallback(
    (held: boolean) => {
      if (held) {
        fireHeldPressCountRef.current += 1;
        if (fireHeldPressCountRef.current !== 1) return;
        onFireInput();
        clearChargeHoldRepeat();
        chargeHoldRepeatRef.current = setInterval(() => {
          if (!chargingRef.current) {
            clearChargeHoldRepeat();
            return;
          }
          bumpChargeClicks();
        }, CHARGE_HOLD_REPEAT_MS);
      } else {
        fireHeldPressCountRef.current = Math.max(0, fireHeldPressCountRef.current - 1);
        if (fireHeldPressCountRef.current !== 0) return;
        clearChargeHoldRepeat();
      }
    },
    [onFireInput, bumpChargeClicks, clearChargeHoldRepeat]
  );

  useEffect(() => {
    onBindFireHeld(setFireHeld);
    return () => onBindFireHeld(null);
  }, [onBindFireHeld, setFireHeld]);

  const half = BLOCK_SIZE / 2;
  const wh = 0;
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

  const bodyYawRad = useMemo(
    () => bodyYawQuarterSnappedFromWorldAim(worldAimYawRad),
    [worldAimYawRad]
  );

  const shootTriggerReady =
    !roundLocked &&
    (cooldownUntil === null || Date.now() >= cooldownUntil) &&
    !shotInFlight &&
    !guidelineFireBlocked;

  const shootTriggerPhase: "ready" | "charging" | "inactive" =
    !shootTriggerReady
      ? "inactive"
      : isCharging
        ? "charging"
        : "ready";

  const fieldWidth = 2 * (2 * FIELD_PLANE_HALF_WIDTH_X);
  const z0 = -FIELD_PLANE_Z_BEFORE_SPAWN;
  const z1 = GOAL_Z_MAX + FIELD_PLANE_Z_PAST_GOAL;
  const fieldDepth = fieldWidth
  // const fieldDepth = 2 * (z1 - z0);
  const fieldZCenter = 200
  // const fieldZCenter = (z0 + z1) / 2;

  const onTerrainTexturedClick = useCallback(
    (coords: { lat: number; lng: number }) => {
      onTerrainCoordsClick?.(coords);
    },
    [onTerrainCoordsClick]
  );

  return (
    <>


{/* 
<group
      position={[0, -50, -150]}
      scale={[99, 99, 99]}
    >
      <EarthTextured clickedHandler={onTerrainTexturedClick} />
    </group>
    */}

{/* 
    <group
      position={[0, -55, fieldZCenter]}
      scale={[fieldWidth / 15, 1, fieldDepth / 15]}
    >
      <TerrainTextured clickedHandler={onTerrainTexturedClick} />
    </group>
      <group
      rotation={[0, Math.PI, 0]}
        position={[0, -55, fieldZCenter-275]}
        scale={[fieldWidth / 15, 1, fieldDepth / 15]}
      >
        <TerrainTextured clickedHandler={onTerrainTexturedClick} />
      </group> */}
      {!hubMode && (
        <>
          <SpawnTeePad />
          <TeeCornerTree biome={biome} />
          <TeeHoleSign
            biome={biome}
            goalLength={goalLength}
            coinCount={yellowLaneMarkers.length}
          />
        </>
      )}
      <SpawnVisualGroup>
        <group ref={enemyLossSinkGroupRef}>
        <group rotation={[0, bodyYawRad, 0]}>
          {vehicle.meshObjPath != null && vehicle.meshObjPath.length > 0 ? (
            <Suspense
              fallback={
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE]} />
                  <meshStandardMaterial
                    color={bodyColor}
                    roughness={0.32}
                    metalness={0.2}
                  />
                </mesh>
              }
            >
              <VehicleObjMesh
                url={vehicle.meshObjPath}
                yawOffsetRad={vehicle.meshObjYawOffsetRad}
              />
            </Suspense>
          ) : vehicle.bodyParts != null && vehicle.bodyParts.length > 0 ? (
            <group>
              <VehicleBodyParts
                parts={vehicle.bodyParts}
                mainRgb={vehicle.mainRgb}
                accentRgb={vehicle.accentRgb}
              />
            </group>
          ) : (
            <mesh castShadow receiveShadow>
              <boxGeometry args={[BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE]} />
              <meshStandardMaterial
                color={bodyColor}
                roughness={0.32}
                metalness={0.2}
              />
            </mesh>
          )}
          {/* vehicleCornerOffsets.map((pos, i) => (
            <VehicleCornerBlock
              key={`wheel-${i}`}
              position={pos}
              size={VEHICLE_CORNER_BLOCK_SIZE}
              color={bodyColor}
            />
          )) */}
          <ShootTriggerCube phase={shootTriggerPhase} onFireHeld={setFireHeld} />
          <VehicleNextShotPowerupLabel
            powerupStackCount={powerupStackCount}
            noBounceActive={noBounceActive}
            noWindActive={noWindActive}
          />
          <VehicleGlassHat hatId={equippedHatId} />
          {equippedFishId != null ? (
            <VehicleOrbitingFish fishId={equippedFishId} />
          ) : null}
          <VehiclePowerupBurst
            burstSeq={powerupVehicleBurstSeq}
            slot={powerupVehicleBurstSlot}
          />
        </group>
        <AimYawPrism
          spawnCenter={[0, 0, 0]}
          aimYawRad={worldAimYawRad}
          defaultVerticalAngleRad={vehicle.launchAngleRad + aimPitchOffsetRad}
          prismLength={
            aimPrismLengthForStrength(vehicle.strengthPerBaseClick) *
            (vehicle.meshObjPath != null && vehicle.meshObjPath.length > 0
              ? 1.14
              : 1)
          }
          color={accentColor}
        />
        </group>
      </SpawnVisualGroup>
      {!hubMode && !pvpMode && <Block center={goalCenter} />}
      {!hubMode && mapCages.length > 0 && (
        <GoalCageDecor cages={mapCages} brokenKeys={goalCagesBroken} />
      )}
      {!hubMode &&
      pvpMode &&
      pvpOpponentVehicle &&
      pvpOpponentWorldPos != null &&
      pvpOpponentFacingToward != null
        ? goalEnemies.map((_, i) => (
            <PvpOpponentVehicle
              key={`pvp-opp-${i}`}
              worldPosition={pvpOpponentWorldPos}
              lookAt={pvpOpponentFacingToward}
              vehicle={pvpOpponentVehicle}
              alive={enemyAliveMask[i] === true}
              enemySimRef={enemySimRef}
              enemyIndex={i}
            />
          ))
        : null}
      {!hubMode &&
      !pvpMode &&
      pveOpponentVehicle &&
      pveOpponentWorldPos != null &&
      pveOpponentFacingToward != null ? (
        <PvpOpponentVehicle
          key="pve-opp-ghost"
          worldPosition={pveOpponentWorldPos}
          lookAt={pveOpponentFacingToward}
          vehicle={pveOpponentVehicle}
          alive={true}
          enemySimRef={enemySimRef}
          enemyIndex={0}
        />
      ) : null}
      {!hubMode &&
        !pvpMode &&
        goalEnemies.map((spec, i) => (
          <GoalMessengerCharacter
            key={`messenger-${i}-${spec.colorHex}-${goalCenter[0]}-${goalCenter[2]}`}
            goalCenter={goalCenter}
            spawnCenter={spawnCenter}
            alive={enemyAliveMask[i] === true}
            paused={roundLocked || shotInFlight}
            onReachedVehicle={onEnemyReachedVehicle}
            enemySimRef={enemySimRef}
            enemyIndex={i}
            colorHex={spec.colorHex}
            startOffsetXZ={goalEnemySpawnOffsetXZ(
              islands,
              goalCenter,
              i,
              goalEnemies.length
            )}
          />
        ))}
      {!hubMode &&
        yellowLaneMarkers.map((center, i) => {
          const ck = coinCellKey(center);
          if (collectedCoinKeysRef.current.has(ck)) return null;
          return <LaneCoin key={`lane-coin-${i}-${ck}`} position={center} />;
        })}
      <SphereToGoal
        meshRef={meshRef}
        projectileRef={projectileRef}
        shotWindAccelRef={shotWindAccelRef}
        spawnCenter={spawnCenter}
        islands={islands}
        goalCenter={goalCenter}
        gravityY={vehicle.gravityY}
        bounceRestitution={vehicle.bounceRestitution}
        rollDeceleration={vehicle.rollDeceleration}
        onProjectileEnd={onProjectileEnd}
        coinCells={yellowLaneMarkers}
        collectedCoinKeysRef={collectedCoinKeysRef}
        onCoinCollected={onCoinCollected}
        enemySimRef={enemySimRef}
        onEnemyHitByBall={onEnemyHitByBall}
        hubMode={hubMode}
        mapCagesRef={mapCagesRef}
        goalCagesBrokenRef={goalCagesBrokenRef}
        onCageTrapped={onCageTrapped}
        pvpMode={pvpMode}
      />
      {ghostSpawnCenter && (
        <SphereToGoal
          key={`ghost-${ghostSpawnKey}`}
          meshRef={ghostMeshRef}
          projectileRef={ghostProjectileRef}
          shotWindAccelRef={ghostShotWindAccelRef}
          spawnCenter={ghostSpawnCenter}
          islands={islands}
          goalCenter={goalCenter}
          gravityY={
            (pvpOpponentVehicle ?? pveOpponentVehicle ?? vehicle).gravityY
          }
          bounceRestitution={
            (pvpOpponentVehicle ?? pveOpponentVehicle ?? vehicle)
              .bounceRestitution
          }
          rollDeceleration={
            (pvpOpponentVehicle ?? pveOpponentVehicle ?? vehicle)
              .rollDeceleration
          }
          onProjectileEnd={onGhostProjectileEnd}
          coinCells={[]}
          collectedCoinKeysRef={ghostCollectedCoinKeysRef}
          onCoinCollected={() => {}}
          enemySimRef={enemySimRef}
          onEnemyHitByBall={ghostEnemyHitNoop}
          hubMode={hubMode}
          mapCagesRef={mapCagesRef}
          goalCagesBrokenRef={goalCagesBrokenRef}
          pvpMode={pvpMode}
        />
      )}
      {guidelinePoints.length >= 2 && (
        <ShotGuidelineArc points={guidelinePoints} />
      )}
    </>
  );
}
