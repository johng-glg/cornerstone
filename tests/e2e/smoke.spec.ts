import { test, expect } from "@playwright/test";

// Smoke: an unauthenticated visit to a protected route redirects to the sign-in page,
// which offers Google SSO and email/password. Real Google SSO sign-in is exercised against
// a configured Supabase environment (not in this smoke run).
test("unauthenticated visit redirects to the sign-in page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
});
