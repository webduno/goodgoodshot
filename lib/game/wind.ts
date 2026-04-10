import { mulberry32 } from "./math";

/**
 * Horizontal wind as constant acceleration on XZ (m/s² in world space).
 * Each shot picks a new random direction and strength (independent of the previous wind).
 */
export type WindXZ = { readonly x: number; readonly z: number };

export const WIND_ACCEL_MAX = 3;

/** New random wind: uniform direction on XZ and magnitude in [0, WIND_ACCEL_MAX]. */
export function stepWind(): WindXZ {
  const angle = Math.random() * Math.PI * 2;
  const mag = Math.random() * WIND_ACCEL_MAX;
  return {
    x: mag * Math.cos(angle),
    z: mag * Math.sin(angle),
  };
}

/** Deterministic wind for shot index `k` so both PvP clients match. */
export function stepWindFromSeed(courseSeed: number, shotIndex: number): WindXZ {
  const rng = mulberry32(courseSeed ^ (shotIndex * 0x9e3779b9));
  const angle = rng() * Math.PI * 2;
  const mag = rng() * WIND_ACCEL_MAX;
  return {
    x: mag * Math.cos(angle),
    z: mag * Math.sin(angle),
  };
}
