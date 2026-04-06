import { POWERUP_SLOTS } from "./constants";

export type Vec3 = readonly [number, number, number];

/** Yellow lane markers and goal stay here in world space; only the spawn block uses `spawnCenter`. */
export const INITIAL_LANE_ORIGIN: Vec3 = [0, 0, 0];

export type PondSpec = {
  worldX: number;
  worldZ: number;
  halfX: number;
  halfZ: number;
  /** Second pond is drawn slightly lower so coplanar water surfaces do not z-fight. */
  surfaceLayer: 0 | 1;
};

/** Axis-aligned island footprint (center + half extents on XZ). */
export type IslandRect = {
  worldX: number;
  worldZ: number;
  halfX: number;
  halfZ: number;
  /** Visual block height (Y); top face stays at `TURF_TOP_Y` in the renderer. */
  blockThickness: number;
};

export type GameState = {
  spawnCenter: Vec3;
  /** World-space Z of green goal center; unchanged on miss, rerolled only on hit. */
  goalWorldZ: number;
  /** World-space X of green goal center; unchanged on miss, rerolled only on hit. */
  goalWorldX: number;
  /** Penalty ponds (0–2); rerolled with goal on hole-out. */
  ponds: readonly PondSpec[];
  /**
   * Course turf layout for the current hole — same between shots until a goal is hit
   * (then recomputed for the new goal).
   */
  islands: readonly IslandRect[];
};

export type GameAction = {
  type: "PROJECTILE_END";
  outcome: "hit" | "miss" | "penalty";
  landing?: Vec3;
  /** Spawn position before the shot that hit the penalty (snapped). */
  revertSpawn?: Vec3;
};

export type Projectile = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  /** Remaining rebounds allowed after current ground contact resolves. */
  bouncesRemaining: number;
  /** Sliding/rolling on the floor with horizontal friction (no gravity). */
  rolling: boolean;
  /** If false, first ground contact ends the shot (no roll phase). */
  allowRoll: boolean;
};

export type PowerupSlotId = (typeof POWERUP_SLOTS)[number]["id"];
