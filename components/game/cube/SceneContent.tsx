"use client";
import {
  launchStrengthFromClicks,
  rgbTupleToCss,
  vehicleChargeMs,
  type PlayerVehicleConfig,
} from "@/components/playerVehicleConfig";
import { useFrame } from "@react-three/fiber";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";
import * as THREE from "three";

import { Block } from "@/components/game/cube/meshes/Block";
import { AimYawPrism } from "@/components/game/cube/meshes/AimYawPrism";
import { SpawnTeePad } from "@/components/game/cube/meshes/SpawnTeePad";
import { TeeCornerTree } from "@/components/game/cube/meshes/TeeCornerTree";
import { TeeHoleSign } from "@/components/game/cube/meshes/TeeHoleSign";
import { ShootTriggerCube } from "@/components/game/cube/meshes/ShootTriggerCube";
import { VehicleBodyParts } from "@/components/game/cube/meshes/VehicleBodyParts";
import { VehicleCornerBlock } from "@/components/game/cube/meshes/VehicleCornerBlock";
import { SphereToGoal } from "@/components/game/cube/SphereToGoal";
import { SpawnVisualGroup } from "@/components/game/cube/TeleportOrbitRig";
import {
  BLOCK_SIZE,
  GOAL_BLOCK_COLOR,
  FIELD_PLANE_HALF_WIDTH_X,
  FIELD_PLANE_Z_BEFORE_SPAWN,
  FIELD_PLANE_Z_PAST_GOAL,
  GOAL_Z_MAX,
  VEHICLE_CORNER_BLOCK_SIZE,
  VEHICLE_WHEEL_FLOOR_Y_EPS,
  VEHICLE_WHEEL_OUTWARD,
} from "@/lib/game/constants";
import {
  aimPrismLengthForStrength,
  bodyYawQuarterSnappedFromWorldAim,
  spawnTopYFromBlockCenterY,
} from "@/lib/game/math";
import { coinCellKey, coinCentersForIslands } from "@/lib/game/path";
import type { IslandRect } from "@/lib/game/islands";
import { INITIAL_LANE_ORIGIN, type Projectile, type Vec3 } from "@/lib/game/types";
import { TerrainTextured } from "../TerrainTextured";

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
              color="#e8c547"
              roughness={0.28}
              metalness={0.88}
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
  onBindFireInput,
  isCharging,
}: {
  spawnCenter: Vec3;
  goalCenter: Vec3;
  islands: readonly IslandRect[];
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
  onProjectileEnd: (outcome: "hit" | "miss" | "penalty", landing?: Vec3) => void;
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
  /** Supplies the fire input handler to outer HUD controls. */
  onBindFireInput: (handler: (() => void) | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const projectileRef = useRef<Projectile | null>(null);
  const shotWindAccelRef = useRef({ x: 0, z: 0 });
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
        vx: horizontalMag * Math.sin(aimYawRad),
        vy,
        vz: horizontalMag * Math.cos(aimYawRad),
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
      aimYawRad,
      getNoBounceActive,
      getPowerupMultiplier,
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

      const n = clickCountRef.current;
      onChargeHudUpdate(null);
      fireProjectile(n);
    }, chargeMs);
  }, [fireProjectile, onChargeHudUpdate, onChargeWindowStart, vehicle]);

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

  const onFireInput = useCallback(() => {
    if (roundLocked) return;
    if (cooldownUntil !== null && Date.now() < cooldownUntil) return;
    if (projectileRef.current) return;

    if (chargingRef.current) {
      clickCountRef.current += 1;
      onChargeHudUpdate({
        remainingMs: Math.max(0, chargeEndsAtRef.current - performance.now()),
        clicks: clickCountRef.current,
      });
      return;
    }

    beginChargeWindow();
  },
    [roundLocked, cooldownUntil, beginChargeWindow, onChargeHudUpdate]
  );

  useEffect(() => {
    onBindFireInput(onFireInput);
    return () => onBindFireInput(null);
  }, [onBindFireInput, onFireInput]);

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
    () => bodyYawQuarterSnappedFromWorldAim(aimYawRad),
    [aimYawRad]
  );

  const shootTriggerReady =
    !roundLocked &&
    (cooldownUntil === null || Date.now() >= cooldownUntil) &&
    !shotInFlight;

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

  const onTerrainTexturedClick = useCallback((_coords: { lat: number; lng: number }) => {
    // Reserved for future map / terrain interactions
  }, []);

  return (
    <>
      <group
        position={[0, -55, fieldZCenter]}
        scale={[fieldWidth / 5, 1, fieldDepth / 5]}
      >
        <TerrainTextured clickedHandler={onTerrainTexturedClick} />
      </group>
      <SpawnTeePad />
      <TeeCornerTree />
      <TeeHoleSign
        goalLength={goalLength}
        coinCount={yellowLaneMarkers.length}
      />
      <SpawnVisualGroup>
        <group rotation={[0, bodyYawRad, 0]}>
          {vehicle.bodyParts != null && vehicle.bodyParts.length > 0 ? (
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
              color={accentColor}
            />
          ))}
          <ShootTriggerCube phase={shootTriggerPhase} onFireInput={onFireInput} />
        </group>
        <AimYawPrism
          spawnCenter={[0, 0, 0]}
          aimYawRad={aimYawRad}
          defaultVerticalAngleRad={vehicle.launchAngleRad + aimPitchOffsetRad}
          prismLength={aimPrismLengthForStrength(vehicle.strengthPerBaseClick)}
          color={accentColor}
        />
      </SpawnVisualGroup>
      <Block center={goalCenter} color={GOAL_BLOCK_COLOR} />
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
      />
    </>
  );
}
