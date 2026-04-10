import type { BiomeId } from "./types";
import {
  FIELD_GROUND_DESERT_SAND,
  FIELD_GROUND_FOREST,
  FIELD_GROUND_MUTED_GREEN,
  FIELD_GROUND_SEA,
  FIELD_GROUND_SNOW,
  FIELD_ISLAND_FOUNDATION_DESERT,
  FIELD_ISLAND_FOUNDATION_FOREST,
  FIELD_ISLAND_FOUNDATION_PLAIN,
  FIELD_ISLAND_FOUNDATION_SEA,
  FIELD_ISLAND_FOUNDATION_SNOW,
  GOAL_GREEN,
} from "./constants";

export const BIOME_IDS: readonly BiomeId[] = [
  "plain",
  "desert",
  "forest",
  "snow",
  "sea",
];

export function isValidBiomeId(value: unknown): value is BiomeId {
  return typeof value === "string" && BIOME_IDS.includes(value as BiomeId);
}

/** Human-readable label (matches biome picker in the start modal). */
export function biomeDisplayName(biome: BiomeId): string {
  switch (biome) {
    case "plain":
      return "Plain";
    case "desert":
      return "Desert";
    case "forest":
      return "Forest";
    case "snow":
      return "Snow";
    case "sea":
      return "Sea";
  }
}

/** Desert uses cactus; other biomes use blocky trees. */
export function biomeUsesCactus(biome: BiomeId): boolean {
  return biome === "desert";
}

/** Desert uses sparse dead shrub; snow uses ice spikes (`IceSpikeBush`) instead. */
export function biomeUsesDeadBush(biome: BiomeId): boolean {
  return biome === "desert";
}

export function islandColorsForBiome(biome: BiomeId): {
  turf: string;
  foundation: string;
} {
  switch (biome) {
    case "desert":
      return {
        turf: FIELD_GROUND_DESERT_SAND,
        foundation: FIELD_ISLAND_FOUNDATION_DESERT,
      };
    case "plain":
      return {
        turf: FIELD_GROUND_MUTED_GREEN,
        foundation: FIELD_ISLAND_FOUNDATION_PLAIN,
      };
    case "forest":
      return {
        turf: FIELD_GROUND_FOREST,
        foundation: FIELD_ISLAND_FOUNDATION_FOREST,
      };
    case "snow":
      return {
        turf: FIELD_GROUND_SNOW,
        foundation: FIELD_ISLAND_FOUNDATION_SNOW,
      };
    case "sea":
      return {
        turf: FIELD_GROUND_SEA,
        foundation: FIELD_ISLAND_FOUNDATION_SEA,
      };
  }
}

/**
 * Minimap tee-box top color (spawn island). Matches biome tone; 3D `SpawnTeePad` still uses
 * `GOAL_GREEN` — this is HUD-only for a readable schematic.
 */
export function minimapTeeSurfaceColor(biome: BiomeId): string {
  switch (biome) {
    case "plain":
      return GOAL_GREEN;
    case "desert":
      return FIELD_GROUND_DESERT_SAND;
    case "forest":
      return GOAL_GREEN;
    case "snow":
      /** Slightly cooler than `FIELD_GROUND_SNOW` so tee reads vs fairway on the minimap. */
      return "#cfe8f4";
    case "sea":
      return GOAL_GREEN;
  }
}
