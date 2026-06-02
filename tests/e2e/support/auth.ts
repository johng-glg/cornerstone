import type { Page } from "@playwright/test";

// Must match TEST_AUTH_STORAGE_KEY in src/lib/testAuth.ts. Duplicated as a literal here so this
// test helper doesn't import the app module (which reads import.meta.env at load time, undefined
// under the Playwright/Node runner).
export const TEST_AUTH_STORAGE_KEY = "cornerstone.e2e.testAuth";

export interface TestUser {
  userId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  companyId?: string;
  department?: string;
  roles?: string[];
}

/**
 * Sign the headless browser into Cornerstone via the dev/test-only auth seam.
 *
 * Writes the synthetic-session marker before any app code runs (so AuthProvider hydrates a fake
 * authenticated session on first paint), and — unless `stubRest: false` — stubs the Supabase
 * REST API so data-driven pages render deterministic empty states instead of hammering the
 * non-existent local backend.
 *
 * Requires the app to be served with VITE_E2E_TEST_AUTH=1 (set by playwright.config webServer).
 */
export async function signInAsTestUser(
  page: Page,
  user: TestUser = {},
  opts: { stubRest?: boolean } = {},
): Promise<void> {
  const marker = JSON.stringify({
    userId: user.userId,
    email: user.email ?? "e2e@guardianlit.com",
    firstName: user.firstName ?? "E2E",
    lastName: user.lastName ?? "Tester",
    companyId: user.companyId,
    department: user.department ?? "admin",
    roles: user.roles ?? ["admin"],
  });

  await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [
    TEST_AUTH_STORAGE_KEY,
    marker,
  ] as const);

  if (opts.stubRest !== false) {
    // Empty result set for any table/RPC read; PostgREST list responses are JSON arrays.
    await page.route("**/rest/v1/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "content-range": "0-0/0" },
        body: "[]",
      }),
    );
  }
}
