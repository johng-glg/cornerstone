import { defineConfig, devices } from "@playwright/test";

// E2E config. Tests live in tests/e2e. The dev server is started automatically
// for local runs; in CI the workflow builds + previews before invoking Playwright.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Enable the dev/test-only auth seam (src/lib/testAuth.ts) so authenticated specs can sign
    // a headless browser in without Google SSO. Only active when a test sets the localStorage
    // marker; the unauthenticated smoke test is unaffected.
    env: { VITE_E2E_TEST_AUTH: "1" },
  },
});
