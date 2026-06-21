import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:5174",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "cd ../backend && cargo run",
      url: "http://localhost:3001/api/v1/health/live",
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "bun run dev",
      url: "http://localhost:5174",
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
