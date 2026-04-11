import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/** Ensures an auth session (anonymous if needed) for Supabase-backed features. */
export async function ensureSupabaseSession(): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) return;

  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    const message =
      typeof error.message === "string" ? error.message : "sign-in failed";
    if (message.includes("anonymous_provider_disabled")) {
      throw new Error(
        "Anonymous sign-ins are disabled in Supabase. Enable Auth > Providers > Anonymous."
      );
    }
    throw new Error(message);
  }

  const {
    data: { session: nextSession },
  } = await supabase.auth.getSession();
  if (!nextSession) {
    throw new Error("Sign-in did not create a session");
  }
}
