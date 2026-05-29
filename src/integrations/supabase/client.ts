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
// Local Supabase defaults so the app still constructs (and renders /auth) when env is
// absent — e.g. CI E2E, or a fresh clone before `.env` exists. Real deployments inject the
// values at build time; these placeholders never connect to anything real.
const LOCAL_DEFAULT_URL = "http://127.0.0.1:54321";
const LOCAL_DEFAULT_ANON_KEY = "public-anon-key-placeholder";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? LOCAL_DEFAULT_URL;
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? LOCAL_DEFAULT_ANON_KEY;

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  console.warn(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY are not set; " +
      "using local placeholders. Copy .env.example to .env for a working backend.",
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
