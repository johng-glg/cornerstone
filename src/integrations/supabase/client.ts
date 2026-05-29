import { createClient } from "@supabase/supabase-js";

/**
 * Singleton Supabase browser client.
 *
 * Configured from environment variables only — no project URL or key is ever
 * committed to source (diverges from the Lovable build, which committed a live
 * `.env`; see docs/lovable_pattern_inventory.md §8). Populate `.env` locally from
 * `.env.example`.
 *
 * Once schema migrations land (Phase A3+), regenerate the typed `Database` interface
 * via `supabase gen types typescript` and parameterise `createClient<Database>`.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  // Fail loudly in development; production builds inject these at deploy time.
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are not set. " +
      "Copy .env.example to .env and fill them in.",
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
