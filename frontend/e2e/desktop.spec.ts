import { expect, test } from "@playwright/test";
import { createTenant, createVerifiedUser, loginAndSetCookies } from "./helpers/auth";

test.describe("desktop OS", () => {
  test("auth kiosk renders a locked centered login form", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("Welcome back").first()).toBeVisible();
    await expect(page.getByLabel("Email").first()).toBeVisible();
    await expect(page.getByLabel("Password").first()).toBeVisible();

    const closeButton = page.locator('button[title="Close"]');
    await expect(closeButton).not.toBeVisible();
  });

  test("admin desktop opens user management app", async ({ page }) => {
    const user = await createVerifiedUser(page.request, {
      role: "admin",
      institutionId: "00000000-0000-0000-0000-000000000001",
    });
    await loginAndSetCookies(page, user);

    await page.goto("http://admin.lvh.me:5174/admin");

    await page.getByText("User Management").first().click();
    await expect(page.getByText("Admin user management mini-app.")).toBeVisible();
  });

  test("tenant deep link opens members app", async ({ page }) => {
    const user = await createVerifiedUser(page.request);
    await loginAndSetCookies(page, user);

    const slug = `e2e-tenant-${Date.now()}`;
    await createTenant(page, { slug, name: "E2E Tenant" });

    await page.goto(`/tenants/${slug}/members`);

    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
  });

  test("mobile viewport shows desktop-only fallback", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    await expect(page.getByText("Desktop only")).toBeVisible();
    await expect(page.getByText("This experience is optimized for desktop.")).toBeVisible();
  });
});
