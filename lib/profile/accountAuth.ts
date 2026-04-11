import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** True when the session has no email (typical anonymous guest before linking). */
export function sessionUserNeedsEmailLink(user: {
  email?: string | null;
} | null): boolean {
  const e = user?.email;
  return e == null || String(e).trim() === "";
}

export function mapAuthPasswordError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("password") && m.includes("6")) {
    return "Password must be at least 6 characters.";
  }
  if (m.includes("invalid login credentials")) {
    return "Wrong email or password.";
  }
  if (m.includes("email not confirmed")) {
    return "Confirm your email link before signing in.";
  }
  return message;
}

export async function linkEmailAndPasswordToCurrentUser(
  email: string,
  password: string
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.updateUser({
    email: email.trim(),
    password,
  });
  if (error) throw error;
}

export async function signInWithEmailPassword(
  email: string,
  password: string
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
}
