import * as THREE from "three";

import {
  AIM_PAD_LOCAL_YAW_HALF_RAD,
  AIM_PITCH_MAX_RAD,
  AIM_PRISM_LENGTH,
  AIM_YAW_STEP_RAD,
  BLOCK_SIZE,
  MIN_PREDETERMINED_STRENGTH_PER_BASE_CLICK,
  SPHERE_RADIUS,
} from "./constants";
import type { Vec3 } from "./types";

/** Deterministic PRNG (Mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const seededRngStack: Array<() => number> = [];

/**
 * Run `fn` while `randomIntInclusive` draws from a deterministic sequence (e.g. course layout from seed).
 */
export function withSeededRNG<T>(seed: number, fn: () => T): T {
  const rng = mulberry32(seed);
  seededRngStack.push(rng);
  try {
    return fn();
  } finally {
    seededRngStack.pop();
  }
}

/** Keep yaw in [-π, π] (~-180° … +180°) after stepping. */
export function wrapYawRad(a: number): number {
  return THREE.MathUtils.euclideanModulo(a + Math.PI, Math.PI * 2) - Math.PI;
}

/**
 * HUD ring angle (atan2(dx, −dy) in screen space) → world XZ yaw for vx = sin(ψ), vz = cos(ψ).
 * Negation aligns the 2D control with the scene/camera so the barrel matches the ring.
 */
export function hudAimYawToWorldYawRad(hudRad: number): number {
  return wrapYawRad(-hudRad);
}

/** Clamp shortest signed delta from a side center to the aim pad arc (±45°). */
export function clampYawDeltaToPadArc(deltaRad: number): number {
  const d = wrapYawRad(deltaRad);
  return Math.max(
    -AIM_PAD_LOCAL_YAW_HALF_RAD,
    Math.min(AIM_PAD_LOCAL_YAW_HALF_RAD, d)
  );
}

/** Snap to the same 5° grid as aim button steps (`AIM_YAW_STEP_RAD`). */
export function snapAimAngleRad(rad: number): number {
  return Math.round(rad / AIM_YAW_STEP_RAD) * AIM_YAW_STEP_RAD;
}

/** Clamps pitch offset from the vehicle base launch angle to ±`AIM_PITCH_MAX_RAD`. */
export function clampAimPitchOffsetRad(offsetRad: number): number {
  return Math.max(-AIM_PITCH_MAX_RAD, Math.min(AIM_PITCH_MAX_RAD, offsetRad));
}

/**
 * Vehicle body yaw in 90° steps so hull forward stays within ±45° of world aim
 * (turret can point farther until the body snaps to the next side).
 */
export function bodyYawQuarterSnappedFromWorldAim(aimYawRad: number): number {
  const quarter = Math.PI / 2;
  const k = Math.round(aimYawRad / quarter);
  return wrapYawRad(k * quarter);
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
  const stack = seededRngStack;
  const u =
    stack.length > 0 ? stack[stack.length - 1]!() : Math.random();
  return Math.floor(u * (max - min + 1)) + min;
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
