import * as THREE from "three";

import {
  AIM_PRISM_LENGTH,
  BLOCK_SIZE,
  MIN_PREDETERMINED_STRENGTH_PER_BASE_CLICK,
  SPHERE_RADIUS,
} from "./constants";
import type { Vec3 } from "./types";

/** Keep yaw in [-π, π] (~-180° … +180°) after stepping. */
export function wrapYawRad(a: number): number {
  return THREE.MathUtils.euclideanModulo(a + Math.PI, Math.PI * 2) - Math.PI;
}

export function spawnTopYFromBlockCenterY(blockCenterY: number): number {
  return blockCenterY + BLOCK_SIZE / 2 + SPHERE_RADIUS;
}

export function snapBlockCenterToGrid(
  v: readonly [number, number, number]
): Vec3 {
  return [Math.round(v[0]), Math.round(v[1]), Math.round(v[2])];
}

export function randomIntInclusive(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function sameVec3(a: Vec3, b: Vec3): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
}

export function formatVec3(v: Vec3): string {
  return `${v[0]}, ${v[1]}, ${v[2]}`;
}

export function aimPrismLengthForStrength(strengthPerBaseClick: number): number {
  return (
    AIM_PRISM_LENGTH *
    (strengthPerBaseClick / MIN_PREDETERMINED_STRENGTH_PER_BASE_CLICK)
  );
}
