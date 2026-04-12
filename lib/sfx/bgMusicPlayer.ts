/**
 * Dedicated HTMLAudioElement for looping background music.
 * Separate from `playSfx` / `sfxPlayer.ts` so SFX never replaces or stops BGM.
 */

let bgmEl: HTMLAudioElement | null = null;
let currentSrc: string | null = null;

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
} as const;

export function startBgmLoop(src: string): void {
  if (typeof window === "undefined") return;
  try {
    const a = getBgmEl();
    if (currentSrc === src && !a.paused) return;
    a.pause();
    a.currentTime = 0;
    a.src = src;
    currentSrc = src;
    void a.play().catch(() => {});
  } catch {
    // ignore (e.g. autoplay policy)
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
