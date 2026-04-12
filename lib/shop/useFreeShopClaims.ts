"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import {
  FREE_SHOP_CLAIMS_CHANGE_EVENT,
  FREE_SHOP_CLAIMS_KEY,
  getNineNineNineCoinBagRemainingMs,
  getThreeCoinBagRemainingMs,
  loadFreeShopClaims,
  saveFreeShopClaims,
  type FreeShopClaimsState,
} from "@/lib/shop/freeShopClaims";

/**
 * Live countdown for free shop items + atomic claim that grants coins and stores claim time.
 */
export function useFreeShopClaims(recordGoldCoins: (count: number) => void) {
  const [state, setState] = useState<FreeShopClaimsState>(() =>
    loadFreeShopClaims()
  );
  const [tick, setTick] = useState(0);

  useLayoutEffect(() => {
    setState(loadFreeShopClaims());
  }, []);

  useEffect(() => {
    const sync = () => setState(loadFreeShopClaims());
    const onStorage = (e: StorageEvent) => {
      if (e.key !== null && e.key !== FREE_SHOP_CLAIMS_KEY) return;
      sync();
    };
    window.addEventListener(FREE_SHOP_CLAIMS_CHANGE_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(FREE_SHOP_CLAIMS_CHANGE_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const threeCoinBagRemainingMs = useMemo(
    () => getThreeCoinBagRemainingMs(state, Date.now()),
    [state, tick]
  );
  const canClaimThreeCoinBag = threeCoinBagRemainingMs === 0;

  const nineNineNineCoinBagRemainingMs = useMemo(
    () => getNineNineNineCoinBagRemainingMs(state, Date.now()),
    [state, tick]
  );
  const canClaimNineNineNineCoinBag = nineNineNineCoinBagRemainingMs === 0;

  const tryClaimThreeCoinBag = useCallback((): boolean => {
    const current = loadFreeShopClaims();
    if (getThreeCoinBagRemainingMs(current, Date.now()) > 0) return false;
    recordGoldCoins(3);
    const next: FreeShopClaimsState = {
      ...current,
      lastThreeCoinBagClaimAtMs: Date.now(),
    };
    saveFreeShopClaims(next);
    setState(next);
    return true;
  }, [recordGoldCoins]);

  const tryClaimNineNineNineCoinBag = useCallback((): boolean => {
    const current = loadFreeShopClaims();
    if (getNineNineNineCoinBagRemainingMs(current, Date.now()) > 0)
      return false;
    recordGoldCoins(999);
    const next: FreeShopClaimsState = {
      ...current,
      lastNineNineNineCoinBagClaimAtMs: Date.now(),
    };
    saveFreeShopClaims(next);
    setState(next);
    return true;
  }, [recordGoldCoins]);

  return {
    canClaimThreeCoinBag,
    threeCoinBagRemainingMs,
    tryClaimThreeCoinBag,
    canClaimNineNineNineCoinBag,
    nineNineNineCoinBagRemainingMs,
    tryClaimNineNineNineCoinBag,
  };
}
