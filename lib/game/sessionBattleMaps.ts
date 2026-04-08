import { BIOME_IDS } from "@/lib/game/biomes";
import {
  createGoalEnemySpecsForBattle,
  createInitialGameState,
  withDefaultBiome,
} from "@/lib/game/gameState";
import type { BiomeId, GameState } from "@/lib/game/types";
import type { PlaySession, SessionBattleCount } from "@/lib/game/playSession";

export const SESSION_BATTLE_MAPS_STORAGE_KEY = "goodgoodshot.sessionBattleMaps.v1";

export type SessionBiomeChoice = "random" | BiomeId;

export type SessionBattleMapsPayload = {
  startedAtMs: number;
  targetBattles: SessionBattleCount;
  maps: GameState[];
};

function isSessionBattleCount(n: number): n is SessionBattleCount {
  return n === 3 || n === 5 || n === 9;
}

function parseGameStateLoose(raw: unknown): GameState | null {
  if (!raw || typeof raw !== "object") return null;
  return withDefaultBiome(raw as GameState);
}

function normalizePayload(parsed: unknown): SessionBattleMapsPayload | null {
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  if (typeof o.startedAtMs !== "number") return null;
  if (typeof o.targetBattles !== "number" || !isSessionBattleCount(o.targetBattles)) {
    return null;
  }
  if (!Array.isArray(o.maps)) return null;
  const maps: GameState[] = [];
  for (const m of o.maps) {
    const g = parseGameStateLoose(m);
    if (!g) return null;
    maps.push(g);
  }
  if (maps.length !== o.targetBattles) return null;
  return {
    startedAtMs: o.startedAtMs,
    targetBattles: o.targetBattles,
    maps,
  };
}

function pickRandomBiome(): BiomeId {
  return BIOME_IDS[Math.floor(Math.random() * BIOME_IDS.length)]!;
}

/** Random biome that is never equal to `previous` when that would leave at least one option. */
function pickRandomBiomeAvoidingPrevious(previous: BiomeId | undefined): BiomeId {
  if (previous === undefined) return pickRandomBiome();
  const candidates = BIOME_IDS.filter((b) => b !== previous);
  if (candidates.length === 0) return pickRandomBiome();
  return candidates[Math.floor(Math.random() * candidates.length)]!;
}

/**
 * Resolves biome per battle: random picks independently; fixed uses the same biome for all.
 */
export function resolveBiomeForBattle(choice: SessionBiomeChoice): BiomeId {
  if (choice === "random") return pickRandomBiome();
  return choice;
}

export function generateSessionBattleMaps(
  targetBattles: SessionBattleCount,
  choice: SessionBiomeChoice
): GameState[] {
  const out: GameState[] = [];
  let prevRandomBiome: BiomeId | undefined;
  for (let i = 0; i < targetBattles; i++) {
    const biome =
      choice === "random"
        ? pickRandomBiomeAvoidingPrevious(prevRandomBiome)
        : choice;
    if (choice === "random") prevRandomBiome = biome;
    out.push(
      createInitialGameState({
        biome,
        goalEnemies: createGoalEnemySpecsForBattle(i),
      })
    );
  }
  return out;
}

export function saveSessionBattleMaps(payload: SessionBattleMapsPayload): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_BATTLE_MAPS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadSessionBattleMaps(): SessionBattleMapsPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_BATTLE_MAPS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return normalizePayload(parsed);
  } catch {
    return null;
  }
}

export function clearSessionBattleMaps(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_BATTLE_MAPS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Returns the map for the current session battle index, or null if storage is missing or stale.
 */
export function getSessionBattleMapForSession(
  session: PlaySession | null
): GameState | null {
  if (!session) return null;
  const payload = loadSessionBattleMaps();
  if (!payload) return null;
  if (
    payload.startedAtMs !== session.startedAtMs ||
    payload.targetBattles !== session.targetBattles
  ) {
    return null;
  }
  const k = session.battlesWon + session.battlesLost;
  if (k < 0 || k >= payload.maps.length) return null;
  return withDefaultBiome(payload.maps[k]);
}
