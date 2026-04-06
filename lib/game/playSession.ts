export const PLAY_SESSION_STORAGE_KEY = "goodgoodshot.playSession.v3";

/** Older keys — migrated on read, removed on save */
const LEGACY_V2_KEY = "goodgoodshot.playSession.v2";
const LEGACY_V1_KEY = "goodgoodshot.playSession.v1";

export type SessionBattleCount = 3 | 9 | 18;

export type PlaySession = {
  targetBattles: SessionBattleCount;
  /** Battles won at or under par (strokes ≤ par). */
  battlesWon: number;
  /** Battles lost (goal hit but strokes > par). */
  battlesLost: number;
  /** Sum of strokes for all completed battles in this session. */
  totalStrokes: number;
  startedAtMs: number;
};

export function defaultPlaySession(targetBattles: SessionBattleCount): PlaySession {
  return {
    targetBattles,
    battlesWon: 0,
    battlesLost: 0,
    totalStrokes: 0,
    startedAtMs: Date.now(),
  };
}

/**
 * Compact session line: strokes/targetBattles(winSpread), e.g. `0/3(+0)` or `12/3(+1)`.
 * `sessionShots` adds the current hole (in-flight) to persisted `totalStrokes`.
 */
export function formatSessionScoreHud(
  session: PlaySession | null,
  sessionShots: number
): string {
  if (!session) {
    return "0/0(+0)";
  }
  const strokes = session.totalStrokes + sessionShots;
  const spread = session.battlesWon - session.battlesLost;
  const spreadStr = `${spread >= 0 ? "+" : ""}${spread}`;
  return `${strokes}/${session.targetBattles}(${spreadStr})`;
}

function isSessionBattleCount(n: number): n is SessionBattleCount {
  return n === 3 || n === 9 || n === 18;
}

function normalizePlaySession(parsed: unknown): PlaySession | null {
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;

  const targetRaw =
    o.targetBattles ?? o.targetTanks ?? o.targetHoles;
  if (typeof targetRaw !== "number" || !isSessionBattleCount(targetRaw)) {
    return null;
  }
  const targetBattles = targetRaw;

  const wonRaw =
    o.battlesWon ?? o.tanksDestroyed ?? o.holesCompleted;
  if (typeof wonRaw !== "number") return null;

  let battlesWon: number;
  let battlesLost: number;
  if (typeof o.battlesLost === "number") {
    battlesWon = Math.max(0, wonRaw);
    battlesLost = Math.max(0, o.battlesLost);
  } else {
    /** Legacy: `wonRaw` was holes completed (each counted as a win). */
    const roundsCompleted = Math.max(0, wonRaw);
    battlesWon = roundsCompleted;
    battlesLost = 0;
  }

  if (typeof o.totalStrokes !== "number" || typeof o.startedAtMs !== "number") {
    return null;
  }

  const roundsDone = battlesWon + battlesLost;
  if (roundsDone < 0 || o.totalStrokes < 0) return null;
  if (roundsDone > targetBattles) return null;

  return {
    targetBattles,
    battlesWon,
    battlesLost,
    totalStrokes: o.totalStrokes,
    startedAtMs: o.startedAtMs,
  };
}

/** Like `loadPlaySession`, but drops a finished session from storage and returns null. */
export function loadActivePlaySession(): PlaySession | null {
  if (typeof window === "undefined") return null;
  const s = loadPlaySession();
  if (s && s.battlesWon + s.battlesLost >= s.targetBattles) {
    clearPlaySession();
    return null;
  }
  return s;
}

function readStoredSessionRaw(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(PLAY_SESSION_STORAGE_KEY) ??
    localStorage.getItem(LEGACY_V2_KEY) ??
    localStorage.getItem(LEGACY_V1_KEY)
  );
}

export function loadPlaySession(): PlaySession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = readStoredSessionRaw();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return normalizePlaySession(parsed);
  } catch {
    return null;
  }
}

export function savePlaySession(s: PlaySession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PLAY_SESSION_STORAGE_KEY, JSON.stringify(s));
    localStorage.removeItem(LEGACY_V2_KEY);
    localStorage.removeItem(LEGACY_V1_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearPlaySession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PLAY_SESSION_STORAGE_KEY);
    localStorage.removeItem(LEGACY_V2_KEY);
    localStorage.removeItem(LEGACY_V1_KEY);
  } catch {
    /* ignore */
  }
}
