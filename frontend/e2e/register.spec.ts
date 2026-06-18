import { expect, test } from "@playwright/test";

test.describe("/register", () => {
  test("creates a user and shows the response", async ({ page }) => {
    await page.goto("/register");

    await page.getByLabel("Name").fill("Ada Lovelace");
    await page.getByLabel("Email").fill(`ada-${Date.now()}@example.com`);
    await page.getByLabel("Password").fill("str0ng!passphrase");
    await page.getByLabel("Role").selectOption("student");
    await page.getByLabel("I accept the terms and conditions").check();

    await page.getByRole("button", { name: "Register" }).click();

    await expect(page.getByText("pending_verification")).toBeVisible();
  });

  test("shows conflict on duplicate email", async ({ page }) => {
    const email = `ada-dup-${Date.now()}@example.com`;

    await page.goto("/register");
    await page.getByLabel("Name").fill("Ada Lovelace");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("str0ng!passphrase");
    await page.getByLabel("Role").selectOption("student");
    await page.getByLabel("I accept the terms and conditions").check();
    await page.getByRole("button", { name: "Register" }).click();

    await expect(page.getByText("pending_verification")).toBeVisible();

    await page.goto("/register");
    await page.getByLabel("Name").fill("Ada Lovelace");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("str0ng!passphrase");
    await page.getByLabel("Role").selectOption("student");
    await page.getByLabel("I accept the terms and conditions").check();
    await page.getByRole("button", { name: "Register" }).click();

    await expect(page.getByText(/conflict|already registered/)).toBeVisible();
  });
});
