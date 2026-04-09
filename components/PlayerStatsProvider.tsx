"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { HoleCompletedPayload, PlayerStatsState } from "@/lib/playerStats/types";
import {
  loadPlayerStats,
  mergeHoleCompleted,
  savePlayerStats,
} from "@/lib/playerStats/storage";

type PlayerStatsContextValue = {
  stats: PlayerStatsState;
  recordHoleCompleted: (payload: HoleCompletedPayload) => void;
  recordGoldCoin: () => void;
  /** Adds `count` coins in one update. */
  recordGoldCoins: (count: number) => void;
  /** Returns whether one coin was deducted (fails at 0 coins). */
  spendGoldCoin: () => boolean;
  /** Deducts `count` coins in one update (fails if balance below `count`). */
  spendGoldCoins: (count: number) => boolean;
};

const PlayerStatsContext = createContext<PlayerStatsContextValue | null>(null);

export function PlayerStatsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [stats, setStats] = useState<PlayerStatsState>(() =>
    loadPlayerStats()
  );

  const recordHoleCompleted = useCallback((payload: HoleCompletedPayload) => {
    setStats((prev) => {
      const next = mergeHoleCompleted(prev, payload);
      savePlayerStats(next);
      return next;
    });
  }, []);

  const recordGoldCoin = useCallback(() => {
    setStats((prev) => {
      const next = { ...prev, totalGoldCoins: prev.totalGoldCoins + 1 };
      savePlayerStats(next);
      return next;
    });
  }, []);

  const recordGoldCoins = useCallback((count: number) => {
    const n = Math.max(0, Math.floor(count));
    if (n <= 0) return;
    setStats((prev) => {
      const next = { ...prev, totalGoldCoins: prev.totalGoldCoins + n };
      savePlayerStats(next);
      return next;
    });
  }, []);

  const spendGoldCoin = useCallback((): boolean => {
    let spent = false;
    setStats((prev) => {
      if (prev.totalGoldCoins <= 0) return prev;
      spent = true;
      const next = { ...prev, totalGoldCoins: prev.totalGoldCoins - 1 };
      savePlayerStats(next);
      return next;
    });
    return spent;
  }, []);

  const spendGoldCoins = useCallback((count: number): boolean => {
    const n = Math.max(0, Math.floor(count));
    if (n <= 0) return true;
    let spent = false;
    setStats((prev) => {
      if (prev.totalGoldCoins < n) return prev;
      spent = true;
      const next = { ...prev, totalGoldCoins: prev.totalGoldCoins - n };
      savePlayerStats(next);
      return next;
    });
    return spent;
  }, []);

  const value = useMemo(
    () => ({
      stats,
      recordHoleCompleted,
      recordGoldCoin,
      recordGoldCoins,
      spendGoldCoin,
      spendGoldCoins,
    }),
    [
      stats,
      recordHoleCompleted,
      recordGoldCoin,
      recordGoldCoins,
      spendGoldCoin,
      spendGoldCoins,
    ]
  );

  return (
    <PlayerStatsContext.Provider value={value}>
      {children}
    </PlayerStatsContext.Provider>
  );
}

export function usePlayerStats(): PlayerStatsContextValue {
  const ctx = useContext(PlayerStatsContext);
  if (!ctx) {
    throw new Error("usePlayerStats must be used within PlayerStatsProvider");
  }
  return ctx;
}
