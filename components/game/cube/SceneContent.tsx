"use client";

import type { ThreeEvent } from "@react-three/fiber";
import {
  launchStrengthFromClicks,
  rgbTupleToCss,
  vehicleChargeMs,
  type PlayerVehicleConfig,
} from "@/components/playerVehicleConfig";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { Block } from "@/components/game/cube/meshes/Block";
import { AimYawPrism } from "@/components/game/cube/meshes/AimYawPrism";
import { PenaltyPond } from "@/components/game/cube/meshes/PenaltyPond";
import { SpawnTeePad } from "@/components/game/cube/meshes/SpawnTeePad";
import { VehicleBodyParts } from "@/components/game/cube/meshes/VehicleBodyParts";
import { VehicleCornerBlock } from "@/components/game/cube/meshes/VehicleCornerBlock";
import { SphereToGoal } from "@/components/game/cube/SphereToGoal";
import { SpawnVisualGroup } from "@/components/game/cube/TeleportOrbitRig";
import {
  BLOCK_SIZE,
  GOAL_BLOCK_COLOR,
  LANE_MARKER_COLOR,
  VEHICLE_CORNER_BLOCK_SIZE,
  VEHICLE_WHEEL_FLOOR_Y_EPS,
  VEHICLE_WHEEL_OUTWARD,
} from "@/lib/game/constants";
import {
  aimPrismLengthForStrength,
  bodyYawQuarterSnappedFromWorldAim,
  spawnTopYFromBlockCenterY,
} from "@/lib/game/math";
import { laneMarkerCenters } from "@/lib/game/path";
import {
  INITIAL_LANE_ORIGIN,
  type PondSpec,
  type Projectile,
  type Vec3,
} from "@/lib/game/types";

export function SceneContent({
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
  getNoBounceActive,
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
  getNoBounceActive: () => boolean;
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
      const noBounceShot = getNoBounceActive();
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
      aimYawRad,
      getNoBounceActive,
      getPowerupMultiplier,
      onShootStart,
      resetPowerupStack,
      spawnCenter,
      vehicle,
    ]
  );

  const beginChargeWindow = useCallback(() => {
    const chargeMs = vehicleChargeMs(vehicle);
    if (chargeTimerRef.current) clearTimeout(chargeTimerRef.current);
    if (chargeTickRef.current) clearInterval(chargeTickRef.current);

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
  }, [fireProjectile, onChargeHudUpdate, vehicle]);

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

  return (
    <>
      <SpawnTeePad />
      <SpawnVisualGroup>
        <group rotation={[0, bodyYawRad, 0]}>
          {vehicle.bodyParts != null && vehicle.bodyParts.length > 0 ? (
            <group onPointerDown={onSpawnPointerDown}>
              <VehicleBodyParts
                parts={vehicle.bodyParts}
                mainRgb={vehicle.mainRgb}
                accentRgb={vehicle.accentRgb}
              />
            </group>
          ) : (
            <mesh onPointerDown={onSpawnPointerDown} castShadow receiveShadow>
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
        </group>
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
