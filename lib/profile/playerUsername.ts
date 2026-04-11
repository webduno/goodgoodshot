import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Letters, numbers, underscore; 2–24 chars after trim. */
export function validateUsernameInput(raw: string): string | null {
  const t = raw.trim();
  if (t.length < 2) return "Use at least 2 characters.";
  if (t.length > 24) return "Use at most 24 characters.";
  if (!/^[a-zA-Z0-9_]+$/.test(t)) {
    return "Only letters, numbers, and underscores.";
  }
  return null;
}

export function mapUsernameRpcError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("username_taken")) return "That username is already taken.";
  if (m.includes("username_already_set")) return "Your username is already set and cannot be changed.";
  if (m.includes("username_too_short")) return "Username is too short.";
  if (m.includes("username_too_long")) return "Username is too long.";
  if (m.includes("username_invalid_chars")) {
    return "Only letters, numbers, and underscores.";
  }
  if (m.includes("not authenticated")) return "Not signed in.";
  if (m.includes("23505") || m.includes("unique")) return "That username is already taken.";
  return message;
}

export async function fetchPlayerUsername(): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("player_profiles")
    .select("username")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  const u = data?.username;
  if (u == null || typeof u !== "string" || u.trim() === "") return null;
  return u;
}

export async function savePlayerUsernameOnce(username: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.rpc("set_player_username", {
    p_username: username,
  });
  if (error) throw error;
}
