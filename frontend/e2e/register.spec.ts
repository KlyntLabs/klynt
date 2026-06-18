import { expect, test } from "@playwright/test";

test.describe("/register", () => {
  test("creates a user and navigates to success", async ({ page }) => {
    const email = `ada-${Date.now()}@example.com`;

    await page.goto("/register");

    await page.getByLabel("Full name").fill("Ada Lovelace");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("str0ng!passphrase");
    await page.getByLabel("I am a").selectOption("student");
    await page.getByLabel(/i agree/i).check();

    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL("/register/success");
    await expect(page.getByText("Account created")).toBeVisible();
    await expect(page.getByText("Welcome, Ada Lovelace")).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
  });

  test("shows inline error on duplicate email", async ({ page }) => {
    const email = `ada-dup-${Date.now()}@example.com`;

    await page.goto("/register");
    await page.getByLabel("Full name").fill("Ada Lovelace");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("str0ng!passphrase");
    await page.getByLabel("I am a").selectOption("student");
    await page.getByLabel(/i agree/i).check();
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL("/register/success");

    await page.goto("/register");
    await page.getByLabel("Full name").fill("Ada Lovelace");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("str0ng!passphrase");
    await page.getByLabel("I am a").selectOption("student");
    await page.getByLabel(/i agree/i).check();
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText(/email already registered/i)).toBeVisible();
  });
});
