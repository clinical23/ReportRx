// Browser-side Supabase client (for client components)
import { createBrowserClient } from '@supabase/ssr'

/**
 * Session length is ultimately controlled in the Supabase dashboard:
 * Authentication → Settings → JWT expiry (e.g. 604800 seconds = 7 days).
 * Keep storage + refresh enabled so returning visitors stay signed in until then.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    },
  )
}
