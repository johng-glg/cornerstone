import { test, expect } from "@playwright/test";

// Smoke test: the app boots and renders the landing shell. Expanded into real user-flow
// coverage (auth/SSO, tenant isolation surfaces) as those land in Phase A4+.
test("landing page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Cornerstone" })).toBeVisible();
});
