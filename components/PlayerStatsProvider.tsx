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

  const value = useMemo(
    () => ({ stats, recordHoleCompleted }),
    [stats, recordHoleCompleted]
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
