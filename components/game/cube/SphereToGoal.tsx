"use client";

import { useFrame } from "@react-three/fiber";
import type { MutableRefObject, RefObject } from "react";
import * as THREE from "three";

import {
  FLOOR_CONTACT_CENTER_Y,
  PLAYER_GROUND_HALF,
  ROLL_STOP_SPEED,
  SPHERE_RADIUS,
} from "@/lib/game/constants";
import { GOAL_ENEMY_HIT_RADIUS } from "@/lib/game/goalEnemy";
import {
  pointInVoidXZ,
  sphereIntersectsAabb,
  sphereIntersectsGoalBox,
} from "@/lib/game/collision";
import { mapCageKey, sphereTouchesMapCage } from "@/lib/game/mapCages";
import { coinCellKey } from "@/lib/game/path";
import { spawnTopYFromBlockCenterY } from "@/lib/game/math";
import type { IslandRect } from "@/lib/game/islands";
import { SFX, playSfx } from "@/lib/sfx/sfxPlayer";
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
  enemySimRef,
  onEnemyHitByBall,
  hubMode = false,
  mapCagesRef,
  goalCagesBrokenRef,
  onCageTrapped,
  pvpMode = false,
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
  onProjectileEnd: (
    outcome: "hit" | "miss" | "penalty" | "enemy_loss" | "enemy_kill",
    landing?: Vec3
  ) => void;
  /** Lane bonus pickups (same cells as yellow markers); 1×1×1 hitbox, no physics. */
  coinCells: readonly Vec3[];
  collectedCoinKeysRef: MutableRefObject<Set<string>>;
  onCoinCollected: (key: string) => void;
  enemySimRef: MutableRefObject<{
    positions: { x: number; y: number; z: number }[];
    alive: boolean[];
  }>;
  /** Ball touched an enemy: update sim; solo rewards via `enemy_kill`, PvP win via `enemy_loss`. */
  onEnemyHitByBall: (enemyIndex: number) => void;
  hubMode?: boolean;
  /** PvP: no goal-block win; win by hitting the opponent vehicle. */
  pvpMode?: boolean;
  mapCagesRef: MutableRefObject<readonly Vec3[]>;
  goalCagesBrokenRef: MutableRefObject<ReadonlySet<string>>;
  onCageTrapped?: () => void;
}) {
  const sx = spawnCenter[0];
  const spawnTopY = spawnTopYFromBlockCenterY(spawnCenter[1]);

  const tryCollectCoins = (
    px: number,
    py: number,
    pz: number
  ) => {
    const half = PLAYER_GROUND_HALF;
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

  const tryCageTrapContact = (
    px: number,
    py: number,
    pz: number,
    mesh: THREE.Mesh
  ): boolean => {
    if (hubMode) return false;
    const cages = mapCagesRef.current;
    const broken = goalCagesBrokenRef.current;
    for (let i = 0; i < cages.length; i++) {
      const c = cages[i]!;
      const cx = Math.round(c[0]);
      const cz = Math.round(c[2]);
      const key = mapCageKey(cx, cz);
      if (broken.has(key)) continue;
      if (!sphereTouchesMapCage(px, py, pz, c)) continue;
      onCageTrapped?.();
      projectileRef.current = null;
      mesh.visible = false;
      mesh.position.set(cx, FLOOR_CONTACT_CENTER_Y, cz);
      onProjectileEnd("miss", [cx, spawnCenter[1], cz]);
      return true;
    }
    return false;
  };

  const tryEnemyHit = (
    px: number,
    py: number,
    pz: number,
    mesh: THREE.Mesh
  ): boolean => {
    const sim = enemySimRef.current;
    const { positions, alive } = sim;
    for (let i = 0; i < positions.length; i++) {
      if (!alive[i]) continue;
      const e = positions[i]!;
      const dx = px - e.x;
      const dy = py - e.y;
      const dz = pz - e.z;
      if (
        Math.hypot(dx, dy, dz) <
        SPHERE_RADIUS + GOAL_ENEMY_HIT_RADIUS
      ) {
        onEnemyHitByBall(i);
        projectileRef.current = null;
        mesh.visible = false;
        if (pvpMode) {
          onProjectileEnd("enemy_loss");
        } else {
          onProjectileEnd("enemy_kill", [px, spawnCenter[1], pz]);
        }
        return true;
      }
    }
    return false;
  };

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    const p = projectileRef.current;
    if (!mesh || !p) return;
    /** Ghost / remote shots never call `fireProjectile` (which flips visibility); keep mesh shown while simulating. */
    mesh.visible = true;

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
      if (tryEnemyHit(p.x, p.y, p.z, mesh)) return;

      const hitGoal =
        !pvpMode &&
        sphereIntersectsGoalBox(
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

      if (tryCageTrapContact(p.x, p.y, p.z, mesh)) return;

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
    if (tryEnemyHit(p.x, p.y, p.z, mesh)) return;

    const hitGoal =
      !pvpMode &&
      sphereIntersectsGoalBox(
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

    if (tryCageTrapContact(p.x, p.y, p.z, mesh)) return;

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

    if (tryCageTrapContact(landingX, FLOOR_CONTACT_CENTER_Y, landingZ, mesh)) {
      return;
    }

    const canBounce =
      p.bouncesRemaining > 0 &&
      vyAfterGravity < 0 &&
      bounceRestitution > 0;
    if (canBounce) {
      playSfx(SFX.land);
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
      playSfx(SFX.rollLand);
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
      <sphereGeometry args={[SPHERE_RADIUS, 10, 8]} />
      <meshBasicMaterial color="#7d7d7d" wireframe />
    </mesh>
  );
}
