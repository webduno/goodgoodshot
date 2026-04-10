"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export async function createPvpRoom(): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.rpc("create_pvp_room");
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
