import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ensureSupabaseSession } from "@/lib/supabase/ensureSession";
import {
  PLAYER_SHOP_INVENTORY_CHANGE_EVENT,
  loadPlayerShopInventory,
  mergePlayerShopInventoryWithRemote,
  parsePlayerShopInventoryFromUnknown,
  savePlayerShopInventory,
} from "@/lib/shop/playerInventory";
import type { PlayerStatsState } from "@/lib/playerStats/types";
import { loadPlayerStats, savePlayerStats } from "@/lib/playerStats/storage";

const FLUSH_DEBOUNCE_MS = 1500;

let flushTimer: ReturnType<typeof setTimeout> | null = null;

export async function fetchPlayerProgressRow(): Promise<{
  username: string | null;
  total_gold_coins: number;
  shop_inventory: unknown | null;
} | null> {
  await ensureSupabaseSession();
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("player_profiles")
    .select("username, total_gold_coins, shop_inventory")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return data as {
    username: string | null;
    total_gold_coins: number;
    shop_inventory: unknown | null;
  };
}

/**
 * Loads server progress when the account has a username, merges with local
 * storage, and persists the merged snapshot locally.
 * Returns merged state, or null when cloud sync does not apply.
 */
export async function hydratePlayerProgressFromServer(): Promise<{
  mergedStats: PlayerStatsState;
} | null> {
  const row = await fetchPlayerProgressRow();
  if (!row) return null;
  const uname = row.username;
  if (typeof uname !== "string" || uname.trim() === "") return null;

  const localStats = loadPlayerStats();
  const localInv = loadPlayerShopInventory();
  const serverCoins = Math.max(
    0,
    Math.floor(
      typeof row.total_gold_coins === "number" ? row.total_gold_coins : 0
    )
  );

  const mergedCoins = Math.max(localStats.totalGoldCoins, serverCoins);
  const mergedInv =
    row.shop_inventory == null
      ? localInv
      : mergePlayerShopInventoryWithRemote(
          localInv,
          parsePlayerShopInventoryFromUnknown(row.shop_inventory)
        );

  const mergedStats: PlayerStatsState = {
    ...localStats,
    totalGoldCoins: mergedCoins,
  };
  savePlayerStats(mergedStats);
  savePlayerShopInventory(mergedInv);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PLAYER_SHOP_INVENTORY_CHANGE_EVENT));
  }
  schedulePlayerProgressFlush();
  return { mergedStats };
}

export async function flushPlayerProgressToServer(): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile, error: profileError } = await supabase
    .from("player_profiles")
    .select("username")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError) {
    console.warn("player_profiles username check", profileError);
    return;
  }
  const u = profile?.username;
  if (typeof u !== "string" || u.trim() === "") return;

  const stats = loadPlayerStats();
  const inv = loadPlayerShopInventory();
  const { error } = await supabase.rpc("set_player_progress", {
    p_total_gold_coins: stats.totalGoldCoins,
    p_shop_inventory: inv,
  });
  if (error) {
    const msg = (error.message ?? "").toLowerCase();
    if (msg.includes("username_required")) return;
    console.warn("set_player_progress", error);
  }
}

export function schedulePlayerProgressFlush(): void {
  if (typeof window === "undefined") return;
  if (flushTimer !== null) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushPlayerProgressToServer();
  }, FLUSH_DEBOUNCE_MS);
}

export function registerPlayerProgressFlushListeners(): () => void {
  if (typeof window === "undefined") return () => {};
  const onHidden = () => {
    if (document.visibilityState === "hidden") void flushPlayerProgressToServer();
  };
  const onUnload = () => void flushPlayerProgressToServer();
  document.addEventListener("visibilitychange", onHidden);
  window.addEventListener("beforeunload", onUnload);
  return () => {
    document.removeEventListener("visibilitychange", onHidden);
    window.removeEventListener("beforeunload", onUnload);
  };
}
