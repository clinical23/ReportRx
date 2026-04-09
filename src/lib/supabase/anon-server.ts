/**
 * Supabase client with the anon key only (no user cookies).
 * Used for auth flows that must not depend on the admin/service role key (e.g. invite OTP).
 */
import { createClient } from "@supabase/supabase-js";

export function createAnonAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return createClient(url, key);
}
