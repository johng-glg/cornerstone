import { test, expect } from "@playwright/test";
import { signInAsTestUser } from "./support/auth";

// Authenticated flows. Production sign-in is Google SSO only, which a headless browser can't
// complete, so these use the dev/test-only auth seam (src/lib/testAuth.ts) to sign in. The
// Supabase REST API is stubbed to empty, so pages render their loaded (empty-state) shell
// deterministically without a live backend.
test.describe("authenticated app", () => {
  test("the test-auth seam lets a headless browser into the app shell", async ({ page }) => {
    await signInAsTestUser(page);
    await page.goto("/");

    // Not bounced to /auth — we're in.
    await expect(page).toHaveURL(/localhost:8080\/$/);
    // Sidebar nav, signed-in identity, and sign-out all render.
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("E2E Tester")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("can navigate to a protected module page", async ({ page }) => {
    await signInAsTestUser(page);
    await page.goto("/");

    await page.getByRole("link", { name: "Workflows" }).click();
    await expect(page).toHaveURL(/\/workflows$/);
    await expect(page.getByRole("heading", { name: "Workflows" })).toBeVisible();
    await expect(page.getByText("No workflow rules yet.")).toBeVisible();
  });

  test("an admin sees the role-impersonation switcher", async ({ page }) => {
    await signInAsTestUser(page, { roles: ["admin"] });
    await page.goto("/");

    await expect(page.getByLabel("Impersonate role view")).toBeVisible();
  });

  test("a non-admin does not see the role-impersonation switcher", async ({ page }) => {
    await signInAsTestUser(page, { roles: ["client_services_rep"], department: "client_services" });
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByLabel("Impersonate role view")).toHaveCount(0);
  });
});
