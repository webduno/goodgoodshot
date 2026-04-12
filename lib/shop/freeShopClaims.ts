export const FREE_SHOP_CLAIMS_KEY = "goodgoodshot.freeShopClaims.v1";

export const FREE_SHOP_CLAIMS_CHANGE_EVENT = "goodgoodshot:freeShopClaims";

/** Cooldown after claiming the 3-coin bag (ms). */
export const THREE_COIN_BAG_COOLDOWN_MS = 30 * 60 * 1000;

/** Cooldown after claiming the 999-coin bag (ms). */
export const NINE_NINE_NINE_COIN_BAG_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export type FreeShopClaimsState = {
  /** Wall-clock ms when the player last claimed the 3-coin bag; `null` = never. */
  lastThreeCoinBagClaimAtMs: number | null;
  /** Wall-clock ms when the player last claimed the 999-coin bag; `null` = never. */
  lastNineNineNineCoinBagClaimAtMs: number | null;
};

export function defaultFreeShopClaims(): FreeShopClaimsState {
  return {
    lastThreeCoinBagClaimAtMs: null,
    lastNineNineNineCoinBagClaimAtMs: null,
  };
}

export function loadFreeShopClaims(): FreeShopClaimsState {
  if (typeof window === "undefined") return defaultFreeShopClaims();
  try {
    const raw = localStorage.getItem(FREE_SHOP_CLAIMS_KEY);
    if (!raw) return defaultFreeShopClaims();
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return defaultFreeShopClaims();
    const p = parsed as Record<string, unknown>;
    const base = defaultFreeShopClaims();
    let lastThreeCoinBagClaimAtMs: number | null = null;
    if (p.lastThreeCoinBagClaimAtMs === null) {
      lastThreeCoinBagClaimAtMs = null;
    } else if (typeof p.lastThreeCoinBagClaimAtMs === "number") {
      const t = Math.floor(p.lastThreeCoinBagClaimAtMs);
      lastThreeCoinBagClaimAtMs = Number.isFinite(t) ? t : null;
    }
    let lastNineNineNineCoinBagClaimAtMs: number | null = null;
    if (p.lastNineNineNineCoinBagClaimAtMs === null) {
      lastNineNineNineCoinBagClaimAtMs = null;
    } else if (typeof p.lastNineNineNineCoinBagClaimAtMs === "number") {
      const t = Math.floor(p.lastNineNineNineCoinBagClaimAtMs);
      lastNineNineNineCoinBagClaimAtMs = Number.isFinite(t) ? t : null;
    }
    return {
      ...base,
      lastThreeCoinBagClaimAtMs,
      lastNineNineNineCoinBagClaimAtMs,
    };
  } catch {
    return defaultFreeShopClaims();
  }
}

export function saveFreeShopClaims(state: FreeShopClaimsState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FREE_SHOP_CLAIMS_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(FREE_SHOP_CLAIMS_CHANGE_EVENT));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearFreeShopClaims(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(FREE_SHOP_CLAIMS_KEY);
    window.dispatchEvent(new Event(FREE_SHOP_CLAIMS_CHANGE_EVENT));
  } catch {
    /* ignore */
  }
}

/** Ms until the 3-coin bag can be claimed again; `0` means ready. */
export function getThreeCoinBagRemainingMs(
  state: FreeShopClaimsState,
  nowMs: number
): number {
  if (state.lastThreeCoinBagClaimAtMs == null) return 0;
  const elapsed = nowMs - state.lastThreeCoinBagClaimAtMs;
  return Math.max(0, THREE_COIN_BAG_COOLDOWN_MS - elapsed);
}

/** Ms until the 999-coin bag can be claimed again; `0` means ready. */
export function getNineNineNineCoinBagRemainingMs(
  state: FreeShopClaimsState,
  nowMs: number
): number {
  if (state.lastNineNineNineCoinBagClaimAtMs == null) return 0;
  const elapsed = nowMs - state.lastNineNineNineCoinBagClaimAtMs;
  return Math.max(0, NINE_NINE_NINE_COIN_BAG_COOLDOWN_MS - elapsed);
}

export function formatMsAsMmSs(totalMs: number): string {
  const totalSec = Math.max(0, Math.ceil(totalMs / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
