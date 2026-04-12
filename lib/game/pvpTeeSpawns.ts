import { createInitialGameStateFromSeed } from "./gameState";
import type { BiomeId, Vec3 } from "./types";

/** World units: perpendicular offset from shared tee so two players stand side by side. */
const PVE_TEE_SIDE_OFFSET = 2;

/**
 * Deterministic host/guest spawn positions for PvE (race to pyramid): both near the tee,
 * offset perpendicular to the tee→goal direction.
 */
export function pveSideBySideSpawnsFromSeed(
  courseSeed: number,
  biome: BiomeId
): {
  hostSpawn: Vec3;
  guestSpawn: Vec3;
} {
  const g = createInitialGameStateFromSeed(courseSeed, {
    goalEnemies: [],
    biome,
  });
  const tee = g.spawnCenter;
  const gx = g.goalWorldX;
  const gz = g.goalWorldZ;
  let px = -(gz - tee[2]);
  let pz = gx - tee[0];
  const plen = Math.hypot(px, pz);
  if (plen < 1e-6) {
    px = PVE_TEE_SIDE_OFFSET;
    pz = 0;
  } else {
    px = (px / plen) * PVE_TEE_SIDE_OFFSET;
    pz = (pz / plen) * PVE_TEE_SIDE_OFFSET;
  }
  const hostSpawn: Vec3 = [
    Math.round(tee[0] + px),
    tee[1],
    Math.round(tee[2] + pz),
  ];
  const guestSpawn: Vec3 = [
    Math.round(tee[0] - px),
    tee[1],
    Math.round(tee[2] - pz),
  ];
  return { hostSpawn, guestSpawn };
}
