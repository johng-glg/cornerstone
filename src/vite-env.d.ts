/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_AUTH_GOOGLE_ONLY?: string;
  // Dev/test-only: enables the synthetic-session auth seam for headless e2e. Never set in
  // production builds. See src/lib/testAuth.ts.
  readonly VITE_E2E_TEST_AUTH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
