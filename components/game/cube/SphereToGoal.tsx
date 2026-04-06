"use client";

import { useFrame } from "@react-three/fiber";
import type { MutableRefObject, RefObject } from "react";
import * as THREE from "three";

import {
  FLOOR_CONTACT_CENTER_Y,
  GOAL_HALF,
  ROLL_STOP_SPEED,
  SPHERE_RADIUS,
} from "@/lib/game/constants";
import {
  pointInVoidXZ,
  sphereIntersectsAabb,
  sphereIntersectsGoalBox,
} from "@/lib/game/collision";
import { coinCellKey } from "@/lib/game/path";
import { spawnTopYFromBlockCenterY } from "@/lib/game/math";
import type { IslandRect } from "@/lib/game/islands";
import { type Projectile, type Vec3 } from "@/lib/game/types";

export function SphereToGoal({
  meshRef,
  projectileRef,
  shotWindAccelRef,
  spawnCenter,
  islands,
  goalCenter,
  gravityY,
  bounceRestitution,
  rollDeceleration,
  onProjectileEnd,
  coinCells,
  collectedCoinKeysRef,
  onCoinCollected,
}: {
  meshRef: RefObject<THREE.Mesh | null>;
  projectileRef: MutableRefObject<Projectile | null>;
  shotWindAccelRef: MutableRefObject<{ x: number; z: number }>;
  spawnCenter: Vec3;
  islands: readonly IslandRect[];
  goalCenter: Vec3;
  gravityY: number;
  bounceRestitution: number;
  rollDeceleration: number;
  onProjectileEnd: (outcome: "hit" | "miss" | "penalty", landing?: Vec3) => void;
  /** Lane bonus pickups (same cells as yellow markers); 1×1×1 hitbox, no physics. */
  coinCells: readonly Vec3[];
  collectedCoinKeysRef: MutableRefObject<Set<string>>;
  onCoinCollected: (key: string) => void;
}) {
  const sx = spawnCenter[0];
  const spawnTopY = spawnTopYFromBlockCenterY(spawnCenter[1]);

  const tryCollectCoins = (
    px: number,
    py: number,
    pz: number
  ) => {
    const half = GOAL_HALF;
    for (const c of coinCells) {
      const key = coinCellKey(c);
      if (collectedCoinKeysRef.current.has(key)) continue;
      if (
        sphereIntersectsAabb(px, py, pz, SPHERE_RADIUS, c, half, half, half)
      ) {
        onCoinCollected(key);
      }
    }
  };

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    const p = projectileRef.current;
    if (!mesh || !p) return;

    const dt = Math.min(delta, 0.05);

    if (p.rolling) {
      const wa = shotWindAccelRef.current;
      p.vx += wa.x * dt;
      p.vz += wa.z * dt;
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

      if (pointInVoidXZ(p.x, p.z, islands)) {
        projectileRef.current = null;
        mesh.position.set(p.x, FLOOR_CONTACT_CENTER_Y, p.z);
        mesh.visible = false;
        onProjectileEnd("penalty");
        return;
      }

      tryCollectCoins(p.x, p.y, p.z);

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
    const wa = shotWindAccelRef.current;
    p.vx += wa.x * dt;
    p.vz += wa.z * dt;
    p.x += p.vx * dt;
    p.y += vyAfterGravity * dt;
    p.z += p.vz * dt;

    tryCollectCoins(p.x, p.y, p.z);

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

    let landingX = p.x;
    let landingZ = p.z;
    if (y0 > FLOOR_CONTACT_CENTER_Y && p.y !== y0) {
      const t = (FLOOR_CONTACT_CENTER_Y - y0) / (p.y - y0);
      landingX = x0 + t * (p.x - x0);
      landingZ = z0 + t * (p.z - z0);
    }

    if (p.y <= FLOOR_CONTACT_CENTER_Y) {
      if (pointInVoidXZ(landingX, landingZ, islands)) {
        projectileRef.current = null;
        mesh.position.set(landingX, FLOOR_CONTACT_CENTER_Y, landingZ);
        mesh.visible = false;
        onProjectileEnd("penalty");
        return;
      }
    }

    if (p.y > FLOOR_CONTACT_CENTER_Y) {
      mesh.position.set(p.x, p.y, p.z);
      return;
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
    if (
      p.allowRoll &&
      rollDeceleration > 0 &&
      hPlan > ROLL_STOP_SPEED
    ) {
      p.x = landingX;
      p.y = FLOOR_CONTACT_CENTER_Y;
      p.z = landingZ;
      p.vy = 0;
      p.rolling = true;
      mesh.position.set(p.x, p.y, p.z);
      return;
    }

    projectileRef.current = null;
    mesh.position.set(landingX, FLOOR_CONTACT_CENTER_Y, landingZ);
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
