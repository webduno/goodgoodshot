/**
 * Dedicated HTMLAudioElement for looping background music.
 * Separate from `playSfx` / `sfxPlayer.ts` so SFX never replaces or stops BGM.
 */

import {
  loadBgmUserEnabled,
  persistBgmUserEnabled,
} from "@/lib/game/bgmPrefSettings";

let bgmEl: HTMLAudioElement | null = null;
let currentSrc: string | null = null;

type BgmParams = { src: string; volume: number; loop: boolean };
let lastBgmParams: BgmParams | null = null;

function getBgmEl(): HTMLAudioElement {
  if (!bgmEl) {
    bgmEl = new Audio();
    bgmEl.preload = "auto";
    bgmEl.loop = true;
  }
  return bgmEl;
}

/** Public URLs under `/public` (e.g. `/sfx/bg/ggshot1.mp3`). */
export const BGM = {
  plaza: "/sfx/bg/ggshot1.mp3",
  /** Home / start-game welcome screen (`app/page.tsx`). */
  welcome: "/sfx/bg/gg3.mp3",
  /** Active battle / course gameplay (`CubeScene`). */
  battle: "/sfx/bg/gg4.mp3",
  /** PvP match (`PvpCubeScene`); PvE co-op uses `battle`. */
  pvp: "/sfx/bg/gg99.mp3",
  /** Battle won — finish modal (`CubeScene`). */
  battleWin: "/sfx/bg/gg5.mp3",
} as const;

/** Resolves `true` if playback started (or was already playing this source). */
export function startBgmLoop(
  src: string,
  volume = 1,
  loop = true
): Promise<boolean> {
  lastBgmParams = { src, volume, loop };
  if (!loadBgmUserEnabled()) return Promise.resolve(false);
  if (typeof window === "undefined") return Promise.resolve(false);
  try {
    const a = getBgmEl();
    a.loop = loop;
    a.volume = Math.max(0, Math.min(1, volume));
    if (currentSrc === src && !a.paused) return Promise.resolve(true);
    a.pause();
    a.currentTime = 0;
    a.src = src;
    currentSrc = src;
    return a.play().then(() => true).catch(() => false);
  } catch {
    return Promise.resolve(false);
  }
}

export function hasLastBgmTrack(): boolean {
  return lastBgmParams !== null;
}

/** Restarts the last track requested via `startBgmLoop` (after user turns music on). */
export function resumeBgm(): Promise<boolean> {
  if (!lastBgmParams) return Promise.resolve(false);
  persistBgmUserEnabled(true);
  return startBgmLoop(
    lastBgmParams.src,
    lastBgmParams.volume,
    lastBgmParams.loop
  );
}

export function isBgmPlaying(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const a = getBgmEl();
    return !a.paused && Boolean(currentSrc);
  } catch {
    return false;
  }
}

export function stopBgm(): void {
  if (typeof window === "undefined") return;
  try {
    const a = getBgmEl();
    a.pause();
    a.currentTime = 0;
    currentSrc = null;
  } catch {
    // ignore
  }
}

/** Stops playback and remembers the preference so scenes do not auto-start BGM. */
export function stopBgmForUser(): void {
  persistBgmUserEnabled(false);
  stopBgm();
}
