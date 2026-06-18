import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";
const dirname =
  typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const isCI = process.env.CI === "true" || process.env.CI === "1";

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    testTimeout: 10_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["src/locales/**/*.json"],
      thresholds: {
        lines: 92,
        functions: 87,
        branches: 73,
        statements: 92,
      },
    },
    projects: [
      {
        extends: true as const,
        test: {
          environment: "jsdom",
          globals: true,
          setupFiles: ["./src/test/setup.ts"],
          exclude: ["e2e/**/*", "node_modules/**/*", "dist/**/*"],
        },
      },
      // Storybook stories are tested locally with a real browser. In CI we skip
      // the browser project because there are no stories yet and installing
      // Playwright browsers adds several minutes (and occasional flakiness).
      ...(isCI
        ? []
        : [
            {
              extends: true as const,
              plugins: [
                // The plugin will run tests for the stories defined in your Storybook config
                // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
                storybookTest({
                  configDir: path.join(dirname, ".storybook"),
                }),
              ],
              test: {
                name: "storybook",
                browser: {
                  enabled: true,
                  headless: true,
                  provider: playwright({}),
                  instances: [
                    {
                      browser: "chromium" as const,
                    },
                  ],
                },
              },
            },
          ]),
    ],
  },
});
