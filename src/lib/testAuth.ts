import type { User, Session } from "@supabase/supabase-js";
import type { StaffProfile } from "@/lib/auth";

/**
 * Secondary, dev/test-only authentication seam.
 *
 * Production sign-in is Google SSO only (see Auth.tsx / VITE_AUTH_GOOGLE_ONLY). A headless
 * browser can't complete a real Google OAuth round-trip, so authenticated e2e (Playwright)
 * needs an alternate way in. This provides one: when the build is compiled with
 * VITE_E2E_TEST_AUTH="1" AND the browser carries a test-session marker in localStorage,
 * AuthProvider hydrates a synthetic authenticated session instead of talking to Supabase.
 *
 * Safety — why this can't become a production backdoor:
 *   * It is gated entirely on a build-time env flag (VITE_E2E_TEST_AUTH) that is NEVER set in
 *     any real deployment. It is intentionally absent from .env.example and from the
 *     staging/prod build workflows. Vite inlines `import.meta.env.VITE_E2E_TEST_AUTH` at build
 *     time, so with the flag unset TEST_AUTH_ENABLED is a literal `false` and this whole path
 *     is dead-code-eliminated out of the bundle — the seam does not exist in production.
 *   * Even with the flag on, nothing happens until a marker is explicitly written to
 *     localStorage (the Playwright helper does this); a normal visitor never triggers it.
 *   * The synthetic session is a fake access token; it authenticates only the client-side UI.
 *     It carries no valid JWT, so any request that actually reached a real Supabase backend
 *     would be rejected by RLS. It is strictly a UI seam for hermetic e2e.
 */
export const TEST_AUTH_ENABLED = import.meta.env.VITE_E2E_TEST_AUTH === "1";

/** localStorage key the Playwright helper writes to opt a page into the synthetic session. */
export const TEST_AUTH_STORAGE_KEY = "cornerstone.e2e.testAuth";

// Guardian Litigation Group tenant — matches the auto-provision migration + seed.
const GUARDIAN_COMPANY_ID = "0a000000-0000-4000-8000-000000000001";

export interface TestAuthMarker {
  userId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  companyId?: string;
  department?: string;
  roles?: string[];
}

export interface TestAuthState {
  user: User;
  session: Session;
  staff: StaffProfile;
  roles: string[];
}

/** Read + parse the marker the e2e helper set, or null if the seam is off / no marker present. */
export function readTestAuthMarker(): TestAuthMarker | null {
  if (!TEST_AUTH_ENABLED || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TEST_AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TestAuthMarker;
    console.warn("[testAuth] synthetic e2e session active — this build is NOT for production.");
    return parsed;
  } catch {
    return null;
  }
}

/** Build the synthetic user/session/staff/roles AuthProvider hydrates for a test sign-in. */
export function buildTestAuthState(marker: TestAuthMarker): TestAuthState {
  const userId = marker.userId ?? "00000000-0000-4000-8000-0000000000e2";
  const email = marker.email ?? "e2e@guardianlit.com";
  const firstName = marker.firstName ?? "E2E";
  const lastName = marker.lastName ?? "Tester";
  const companyId = marker.companyId ?? GUARDIAN_COMPANY_ID;
  const department = marker.department ?? "admin";
  const roles = marker.roles ?? ["admin"];

  const user = {
    id: userId,
    aud: "authenticated",
    role: "authenticated",
    email,
    app_metadata: { provider: "e2e" },
    user_metadata: { first_name: firstName, last_name: lastName },
    created_at: new Date(0).toISOString(),
  } as unknown as User;

  const session = {
    access_token: "e2e-synthetic-access-token",
    refresh_token: "e2e-synthetic-refresh-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user,
  } as unknown as Session;

  const staff: StaffProfile = {
    id: "11111111-1111-4111-8111-111111111111",
    user_id: userId,
    company_id: companyId,
    first_name: firstName,
    last_name: lastName,
    email,
    phone: null,
    department,
    job_title: null,
    is_active: true,
    avatar_url: null,
  };

  return { user, session, staff, roles };
}

/** Clear the marker so a test sign-out doesn't re-hydrate on the next load. */
export function clearTestAuthMarker(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TEST_AUTH_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
