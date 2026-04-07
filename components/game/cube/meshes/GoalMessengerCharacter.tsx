"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { MutableRefObject } from "react";
import type { Group, Mesh } from "three";

import { TURF_TOP_Y } from "@/lib/game/constants";
import {
  GOAL_ENEMY_WALK_SPEED,
  messengerTouchesVehicle,
} from "@/lib/game/goalEnemy";
import type { Vec3 } from "@/lib/game/types";

/** Base mesh scale vs original; collision radii in `goalEnemy.ts` match this. */
const SIZE = 2;
const HEAD_R = 0.16 * SIZE;
const BODY_R = 0.2 * SIZE;
/** Local Y of body sphere center (feet at y=0 in group space). */
const BODY_CENTER_Y = BODY_R;
const ARM_R = 0.07 * SIZE;
/** Classic MSN / Messenger icon blue — single solid color. */
const MESSENGER_ICON_BLUE = "#0099ff";

const MESSENGER_MATERIAL_PROPS = {
  color: MESSENGER_ICON_BLUE,
  transparent: true,
  opacity: 0.8,
  depthWrite: false,
  roughness: 0.38,
  metalness: 0.06,
} as const;

export function GoalMessengerCharacter({
  goalCenter,
  spawnCenter,
  alive,
  paused,
  onReachedVehicle,
  enemyPosRef,
}: {
  goalCenter: Vec3;
  spawnCenter: Vec3;
  alive: boolean;
  paused: boolean;
  onReachedVehicle: () => void;
  enemyPosRef: MutableRefObject<{ x: number; y: number; z: number }>;
}) {
  const groupRef = useRef<Group>(null);
  const armLRef = useRef<Mesh>(null);
  const armRRef = useRef<Mesh>(null);
  const reachedRef = useRef(false);
  const tRef = useRef(0);

  const startXZ = useMemo(
    () => ({
      x: goalCenter[0] + 0.35,
      z: goalCenter[2] - 0.85,
    }),
    [goalCenter]
  );

  const posRef = useRef({ x: startXZ.x, z: startXZ.z });

  useEffect(() => {
    posRef.current = {
      x: startXZ.x,
      z: startXZ.z,
    };
    reachedRef.current = false;
  }, [startXZ.x, startXZ.z]);

  useLayoutEffect(() => {
    enemyPosRef.current.x = startXZ.x;
    enemyPosRef.current.z = startXZ.z;
    enemyPosRef.current.y = TURF_TOP_Y + BODY_CENTER_Y;
  }, [enemyPosRef, startXZ.x, startXZ.z]);

  useFrame((_, delta) => {
    if (!alive) return;
    if (paused || reachedRef.current) return;

    const dt = Math.min(delta, 0.05);
    tRef.current += dt;

    const spawnX = spawnCenter[0];
    const spawnZ = spawnCenter[2];
    let { x, z } = posRef.current;

    if (messengerTouchesVehicle(x, z, spawnX, spawnZ)) {
      reachedRef.current = true;
      onReachedVehicle();
      return;
    }

    const dx = spawnX - x;
    const dz = spawnZ - z;
    const len = Math.hypot(dx, dz);
    if (len < 1e-6) {
      reachedRef.current = true;
      onReachedVehicle();
      return;
    }
    const step = GOAL_ENEMY_WALK_SPEED * dt;
    const nx = dx / len;
    const nz = dz / len;
    x += nx * Math.min(step, len);
    z += nz * Math.min(step, len);
    posRef.current = { x, z };
    enemyPosRef.current.x = x;
    enemyPosRef.current.z = z;

    if (messengerTouchesVehicle(x, z, spawnX, spawnZ)) {
      reachedRef.current = true;
      onReachedVehicle();
      return;
    }

    if (groupRef.current) {
      groupRef.current.position.x = x;
      groupRef.current.position.z = z;
      const yaw = Math.atan2(nx, nz);
      groupRef.current.rotation.y = yaw;
      const bob = Math.sin(tRef.current * 10) * (0.018 * SIZE);
      groupRef.current.position.y = TURF_TOP_Y + bob;
      enemyPosRef.current.y = TURF_TOP_Y + BODY_CENTER_Y + bob;
    }

    const swing = Math.sin(tRef.current * 9) * 0.55;
    if (armLRef.current) armLRef.current.rotation.x = swing;
    if (armRRef.current) armRRef.current.rotation.x = -swing;
  });

  if (!alive) return null;

  const bodyY = BODY_CENTER_Y;
  const headY = bodyY + BODY_R + HEAD_R;

  return (
    <group ref={groupRef} position={[startXZ.x, TURF_TOP_Y, startXZ.z]}>
      <mesh position={[0, headY, 0]} castShadow>
        <sphereGeometry args={[HEAD_R, 14, 12]} />
        <meshStandardMaterial {...MESSENGER_MATERIAL_PROPS} />
      </mesh>
      <mesh position={[0, bodyY, 0]} castShadow scale={[1, 1.15, 1]}>
        <sphereGeometry args={[BODY_R, 16, 14]} />
        <meshStandardMaterial {...MESSENGER_MATERIAL_PROPS} />
      </mesh>
      <mesh
        ref={armLRef}
        position={[-BODY_R - ARM_R * 0.4, bodyY + 0.06 * SIZE, 0]}
        castShadow
        scale={[0.55, 1.15, 0.55]}
      >
        <sphereGeometry args={[ARM_R, 10, 8]} />
        <meshStandardMaterial {...MESSENGER_MATERIAL_PROPS} />
      </mesh>
      <mesh
        ref={armRRef}
        position={[BODY_R + ARM_R * 0.4, bodyY + 0.06 * SIZE, 0]}
        castShadow
        scale={[0.55, 1.15, 0.55]}
      >
        <sphereGeometry args={[ARM_R, 10, 8]} />
        <meshStandardMaterial {...MESSENGER_MATERIAL_PROPS} />
      </mesh>
    </group>
  );
}
