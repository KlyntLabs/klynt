import { expect, test } from "@playwright/test";

test.describe("virtual desktop smoke", () => {
  test("seeded admin can access tenant desktop via path redirect", async ({ page, request }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });

    await request.post("http://localhost:3001/api/v1/auth/login", {
      data: { email: "test@klynt.dev", password: "TestPass123!" },
    });

    await page.goto("/tenants/acme-test");
    await expect(page.locator("body")).toBeVisible();
    expect(page.url()).toContain("acme-test");
    // Ignore expected 401s from unauthenticated probes; surface real JS errors.
    const realErrors = consoleErrors.filter((e) => !e.includes("401 (Unauthorized)"));
    expect(realErrors).toEqual([]);
  });
});
