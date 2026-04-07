"use client";
import {
  launchStrengthFromClicks,
  rgbTupleToCss,
  vehicleChargeMs,
  type PlayerVehicleConfig,
} from "@/components/playerVehicleConfig";
import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
} from "react";
import * as THREE from "three";

import { Block } from "@/components/game/cube/meshes/Block";
import { GoalMessengerCharacter } from "@/components/game/cube/meshes/GoalMessengerCharacter";
import { AimYawPrism } from "@/components/game/cube/meshes/AimYawPrism";
import { SpawnTeePad } from "@/components/game/cube/meshes/SpawnTeePad";
import { TeeCornerTree } from "@/components/game/cube/meshes/TeeCornerTree";
import { TeeHoleSign } from "@/components/game/cube/meshes/TeeHoleSign";
import { ShootTriggerCube } from "@/components/game/cube/meshes/ShootTriggerCube";
import { VehicleBodyParts } from "@/components/game/cube/meshes/VehicleBodyParts";
import { VehicleCornerBlock } from "@/components/game/cube/meshes/VehicleCornerBlock";
import { VehicleObjMesh } from "@/components/game/cube/meshes/VehicleObjMesh";
import { SphereToGoal } from "@/components/game/cube/SphereToGoal";
import {
  type BallFollowStateRef,
  SpawnVisualGroup,
} from "@/components/game/cube/TeleportOrbitRig";
import {
  BLOCK_SIZE,
  GOAL_BLOCK_COLOR,
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
import { coinCellKey, coinCentersForIslands } from "@/lib/game/path";
import type { IslandRect } from "@/lib/game/islands";
import {
  INITIAL_LANE_ORIGIN,
  type BiomeId,
  type Projectile,
  type Vec3,
} from "@/lib/game/types";
import { TerrainTextured } from "../TerrainTextured";
import { PowerupHudIcon } from "@/components/game/cube/hud/PowerupHudIcon";
import { POWERUP_SLOT_ACCENT } from "@/components/gameHudStyles";
import { EarthTextured } from "../EarthTextured";
import { ShotGuidelineArc } from "@/components/game/cube/ShotGuidelineArc";
import { sampleFirstSegmentGuideline } from "@/lib/game/firstSegmentGuideline";

/** Interval between automatic +power steps while Fire / Space / rear trigger is held (charge window). */
const CHARGE_HOLD_REPEAT_MS = 85;

/** Local Y above spawn block center: clears default hull top (~0.5) and typical barrel. */
const VEHICLE_POWERUP_LABEL_Y = 0.92;

/**
 * Drei `Html` defaults to `zIndexRange` [16777271, 0], so labels paint above fixed UI (e.g. modals at
 * z-index 50). Keep world-space HTML strictly below overlays (`modalBackdrop` / toasts use 50).
 */
const VEHICLE_HTML_Z_INDEX_RANGE: [number, number] = [35, 0];

function pillStyle(
  slot: "strength" | "noBounce" | "nowind" | "guideline"
): CSSProperties {
  const a = POWERUP_SLOT_ACCENT[slot];
  const text =
    slot === "strength"
      ? "#7c2d12"
      : slot === "noBounce"
        ? "#4c1d95"
        : slot === "nowind"
          ? "#0c4a5e"
          : "#134e4a";
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
  guidelineActiveNextShot,
  onGuidelineClick,
}: {
  powerupStackCount: number;
  noBounceActive: boolean;
  noWindActive: boolean;
  guidelineActiveNextShot: boolean;
  onGuidelineClick?: () => void;
}) {
  const hasAny =
    powerupStackCount > 0 ||
    noBounceActive ||
    noWindActive ||
    guidelineActiveNextShot;
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
          {guidelineActiveNextShot &&
            (onGuidelineClick ? (
              <button
                type="button"
                aria-label="Guideline info"
                onClick={(e) => {
                  e.stopPropagation();
                  onGuidelineClick();
                }}
                style={{
                  ...pillStyle("guideline"),
                  pointerEvents: "auto",
                  cursor: "pointer",
                  margin: 0,
                  font: "inherit",
                  fontFamily: "inherit",
                }}
              >
                <PowerupHudIcon slotId="guideline" color="currentColor" size={11} />
                Guideline
              </button>
            ) : (
              <span style={pillStyle("guideline")}>
                <PowerupHudIcon slotId="guideline" color="currentColor" size={11} />
                Guideline
              </span>
            ))}
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
  onGuidelinePillClick,
  ballFollowStateRef,
  onEnemyKillReward,
}: {
  spawnCenter: Vec3;
  goalCenter: Vec3;
  islands: readonly IslandRect[];
  biome: BiomeId;
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
    outcome: "hit" | "miss" | "penalty" | "enemy_loss",
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
  /** Queued strength stacks (2^count multiplier) for the next shot. */
  powerupStackCount: number;
  noBounceActive: boolean;
  noWindActive: boolean;
  /** True after activating Guideline until that shot is fired. */
  guidelineActiveNextShot: boolean;
  /** Clears guideline state when the ball is launched (next shot only). */
  onGuidelineConsumedForShot: () => void;
  /**
   * While charging: live clicks. When null but guideline is armed: idle preview uses
   * `guidelinePreviewClicks` (slider value, kept after Ready until the shot).
   */
  chargeHudForGuideline: { clicks: number } | null;
  /** Idle guideline preview: click count (1 … ref bar max); same value after Ready until charging. */
  guidelinePreviewClicks: number;
  /** True while adjusting guideline: shoot controls do not start a charge. */
  guidelineFireBlocked: boolean;
  /** Earth / terrain mesh pick: parent can show HUD toast (e.g. coordinates). */
  onTerrainCoordsClick?: (coords: { lat: number; lng: number }) => void;
  /** Opens Guideline info (e.g. when the floating Guideline pill is tapped). */
  onGuidelinePillClick?: () => void;
  ballFollowStateRef: BallFollowStateRef;
  /** +3 gold + confetti when the ball hits the goal messenger. */
  onEnemyKillReward: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const projectileRef = useRef<Projectile | null>(null);
  const shotWindAccelRef = useRef({ x: 0, z: 0 });
  const chargingRef = useRef(false);
  const clickCountRef = useRef(1);
  const chargeEndsAtRef = useRef(0);
  const chargeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chargeTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chargeHoldRepeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Counts simultaneous press sources (pointer + Space) so hold repeat stops only when all release. */
  const fireHeldPressCountRef = useRef(0);

  const [messengerAlive, setMessengerAlive] = useState(true);
  const messengerAliveRef = useRef(true);
  const enemyPosRef = useRef({ x: 0, y: TURF_TOP_Y + 0.2, z: 0 });

  useEffect(() => {
    setMessengerAlive(true);
    messengerAliveRef.current = true;
  }, [goalCenter[0], goalCenter[2]]);

  const onEnemyKilledByBall = useCallback(() => {
    if (!messengerAliveRef.current) return;
    messengerAliveRef.current = false;
    setMessengerAlive(false);
    onEnemyKillReward();
  }, [onEnemyKillReward]);

  const onEnemyReachedVehicle = useCallback(() => {
    const p = projectileRef.current;
    if (p) {
      projectileRef.current = null;
      const mesh = meshRef.current;
      if (mesh) mesh.visible = false;
    }
    onProjectileEnd("enemy_loss");
  }, [onProjectileEnd]);

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
    const force =
      launchStrengthFromClicks(clicks, vehicle) * getPowerupMultiplier();
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
  ]);

  const fireProjectile = useCallback(
    (clicks: number) => {
      onGuidelineConsumedForShot();
      const w = prepareShotWind();
      shotWindAccelRef.current = { x: w.ax, z: w.az };
      const force =
        launchStrengthFromClicks(clicks, vehicle) * getPowerupMultiplier();
      const noBounceShot = getNoBounceActive();
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
      onShootStart();
    },
    [
      aimPitchOffsetRad,
      worldAimYawRad,
      getNoBounceActive,
      getPowerupMultiplier,
      onGuidelineConsumedForShot,
      onShootStart,
      prepareShotWind,
      resetPowerupStack,
      spawnCenter,
      vehicle,
    ]
  );

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

  const yellowLaneMarkers = useMemo(
    () => coinCentersForIslands(islands, INITIAL_LANE_ORIGIN[1]),
    [islands]
  );

  const goalLength = useMemo(() => {
    const dx = goalCenter[0] - spawnCenter[0];
    const dz = goalCenter[2] - spawnCenter[2];
    return Math.hypot(dx, dz);
  }, [goalCenter, spawnCenter]);

  void coinRenderTick;

  useFrame(() => {
    const mesh = meshRef.current;
    const p = projectileRef.current;
    const st = ballFollowStateRef.current;
    if (mesh && p) {
      st.pos.copy(mesh.position);
      st.valid = true;
    } else {
      st.valid = false;
    }
  });

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


<group
      position={[0, -50, -150]}
      scale={[99, 99, 99]}
    >
      <EarthTextured clickedHandler={onTerrainTexturedClick} />
    </group>

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
      <SpawnTeePad />
      <TeeCornerTree biome={biome} />
      <TeeHoleSign
        biome={biome}
        goalLength={goalLength}
        coinCount={yellowLaneMarkers.length}
      />
      <SpawnVisualGroup>
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
          {vehicleCornerOffsets.map((pos, i) => (
            <VehicleCornerBlock
              key={`wheel-${i}`}
              position={pos}
              size={VEHICLE_CORNER_BLOCK_SIZE}
              color={bodyColor}
            />
          ))}
          <ShootTriggerCube phase={shootTriggerPhase} onFireHeld={setFireHeld} />
          <VehicleNextShotPowerupLabel
            powerupStackCount={powerupStackCount}
            noBounceActive={noBounceActive}
            noWindActive={noWindActive}
            guidelineActiveNextShot={guidelineActiveNextShot}
            onGuidelineClick={onGuidelinePillClick}
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
      </SpawnVisualGroup>
      <Block center={goalCenter} color={GOAL_BLOCK_COLOR} />
      <GoalMessengerCharacter
        goalCenter={goalCenter}
        spawnCenter={spawnCenter}
        alive={messengerAlive}
        paused={roundLocked}
        onReachedVehicle={onEnemyReachedVehicle}
        enemyPosRef={enemyPosRef}
      />
      {yellowLaneMarkers.map((center, i) => {
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
        enemyAliveRef={messengerAliveRef}
        enemyPosRef={enemyPosRef}
        onEnemyKilledByBall={onEnemyKilledByBall}
      />
      {guidelinePoints.length >= 2 && (
        <ShotGuidelineArc points={guidelinePoints} />
      )}
    </>
  );
}
