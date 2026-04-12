/**
 * Single shared HTMLAudioElement: one DOM node, swap `src` per clip.
 * Rapid calls stop the current sound and play the latest (no stacking).
 */

import {
  loadSfxEnabled as loadSfxEnabledFromStorage,
  persistSfxEnabled,
} from "@/lib/game/sfxSettings";

let shared: HTMLAudioElement | null = null;
let sfxEnabled = true;
let sfxPrefsLoaded = false;

function ensureSfxPrefs(): void {
  if (typeof window === "undefined" || sfxPrefsLoaded) return;
  sfxEnabled = loadSfxEnabledFromStorage();
  sfxPrefsLoaded = true;
}

export function getSfxEnabled(): boolean {
  ensureSfxPrefs();
  return sfxEnabled;
}

export function setSfxEnabled(enabled: boolean): void {
  ensureSfxPrefs();
  sfxEnabled = enabled;
  sfxPrefsLoaded = true;
  persistSfxEnabled(enabled);
}

function getShared(): HTMLAudioElement {
  if (!shared) {
    shared = new Audio();
    shared.preload = "auto";
  }
  return shared;
}

/** Public URLs under `/public` (e.g. `/sfx/short/msn.mp3`). Add keys as you add files. */
export const SFX = {
  enemyKill: "/sfx/short/cling.mp3",
  shoot: "/sfx/short/shoot1.mp3",
  slash: "/sfx/short/slash.mp3",
  coinCollect: "/sfx/coinss.mp3",
  land: "/sfx/boin.mp3",
  /** Ground contact when bounces are exhausted and the ball begins rolling. */
  rollLand: "/sfx/land.mp3",
  errorBip: "/sfx/short/errorbip.mp3",
  /** Welcome mode tiles (Singleplayer / Multiplayer hover). */
  passbip: "/sfx/short/passbip.mp3",
  /** Welcome modal info + music bubble orbs. */
  bop: "/sfx/short/bop.mp3",
  conff: "/sfx/short/conff.mp3",
  kash: "/sfx/short/kash.mp3",
} as const;

export function playSfx(src: string): void {
  if (typeof window === "undefined") return;
  ensureSfxPrefs();
  if (!sfxEnabled) return;
  try {
    const a = getShared();
    a.pause();
    a.currentTime = 0;
    a.src = src;
    void a.play().catch(() => {});
  } catch {
    // ignore (e.g. autoplay policy)
  }
}
