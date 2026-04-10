"use client";

import { rgbTupleToCss, type PlayerVehicleConfig } from "@/components/playerVehicleConfig";
import { VehicleBodyParts } from "@/components/game/cube/meshes/VehicleBodyParts";
import { VehicleObjMesh } from "@/components/game/cube/meshes/VehicleObjMesh";
import { Html } from "@react-three/drei";
import { BLOCK_SIZE, TURF_TOP_Y } from "@/lib/game/constants";
import { goalEnemySpawnOffsetXZ } from "@/lib/game/goalEnemyPlacement";
import { bodyYawQuarterSnappedFromWorldAim } from "@/lib/game/math";
import type { IslandRect } from "@/lib/game/islands";
import type { Vec3 } from "@/lib/game/types";
import { useLayoutEffect, useMemo, type MutableRefObject } from "react";
import { Suspense } from "react";

/**
 * Static opponent vehicle at the goal (same anchor as goal messenger). Updates
 * `enemySimRef` for ball collision.
 */
export function PvpOpponentVehicle({
  goalCenter,
  spawnCenter,
  islands,
  vehicle,
  alive,
  enemySimRef,
  enemyIndex,
}: {
  goalCenter: Vec3;
  spawnCenter: Vec3;
  islands: readonly IslandRect[];
  vehicle: PlayerVehicleConfig;
  alive: boolean;
  enemySimRef: MutableRefObject<{
    positions: { x: number; y: number; z: number }[];
    alive: boolean[];
  }>;
  enemyIndex: number;
}) {
  const startOffsetXZ = useMemo(
    () => goalEnemySpawnOffsetXZ(islands, goalCenter, enemyIndex, 1),
    [islands, goalCenter, enemyIndex]
  );

  const x = goalCenter[0] + 0.35 + startOffsetXZ.x;
  const z = goalCenter[2] - 0.85 + startOffsetXZ.z;
  const y = goalCenter[1];

  const worldAimYawRad = useMemo(
    () => Math.atan2(spawnCenter[0] - x, spawnCenter[2] - z),
    [spawnCenter[0], spawnCenter[2], x, z]
  );
  const bodyYawRad = useMemo(
    () => bodyYawQuarterSnappedFromWorldAim(worldAimYawRad),
    [worldAimYawRad]
  );

  const bodyColor = rgbTupleToCss(vehicle.mainRgb);

  useLayoutEffect(() => {
    const slot = enemySimRef.current.positions[enemyIndex];
    if (!slot) return;
    slot.x = x;
    slot.z = z;
    slot.y = TURF_TOP_Y + 0.45;
  }, [enemySimRef, enemyIndex, x, z]);

  if (!alive) {
    return null;
  }

  return (
    <group position={[x, y, z]} rotation={[0, bodyYawRad, 0]}>
      <Html
        position={[0, 1.15, 0]}
        center
        distanceFactor={12}
        zIndexRange={[32, 0] as [number, number]}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        <span
          style={{
            padding: "2px 8px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 700,
            color: "#0f172a",
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(15,23,42,0.12)",
            whiteSpace: "nowrap",
          }}
        >
          Opponent
        </span>
      </Html>
      <group scale={2.35}>
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
      </group>
    </group>
  );
}
