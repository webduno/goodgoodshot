"use client";

import type { SessionBiomeChoice } from "@/lib/game/sessionBattleMaps";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export async function createPvpRoom(
  matchMode: "pvp" | "pve" = "pvp",
  biomeChoice: SessionBiomeChoice = "random"
): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("create_pvp_room", {
    p_match_mode: matchMode,
    p_biome_choice: biomeChoice,
  });
  if (error) throw error;
  if (data == null || typeof data !== "string") {
    throw new Error("create_pvp_room returned no id");
  }
  return data;
}

export async function joinFirstOpenPvpRoom(): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("join_first_open_pvp_room");
  if (error) throw error;
  if (data == null) return null;
  return typeof data === "string" ? data : String(data);
}

export type OpenPvpRoomRow = {
  id: string;
  created_at: string;
  course_seed: number;
  status: string;
  match_mode?: "pvp" | "pve";
  biome_choice?: string;
};

export async function listOpenPvpRoomsToday(): Promise<OpenPvpRoomRow[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("list_open_pvp_rooms_today");
  if (error) throw error;
  if (!data || !Array.isArray(data)) return [];
  return data as OpenPvpRoomRow[];
}

export async function joinPvpRoomById(roomId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("join_pvp_room_by_id", {
    p_room_id: roomId,
  });
  if (error) throw error;
}
