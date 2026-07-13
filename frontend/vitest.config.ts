import path from "node:path";
import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

const dirname =
  typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const enableStorybookBrowserTests =
  process.env.STORYBOOK_TEST === "true" || process.env.STORYBOOK_TEST === "1";

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
      // src/test/** is test scaffolding — the render helper, msw handlers, and the jsdom
      // shims — not product code. Counting it distorted the gate in both directions: the msw
      // handlers inflated the number, while the Popover/dialog shims (whose feature-detect
      // branches never run under jsdom) deflated it. Neither tells us anything about how well
      // Klynt's own code is tested.
      exclude: ["src/locales/**/*.json", "src/test/**"],
      // Re-baselined for the Astryx migration (docs/astryx-migration-plan.md, Phase 1).
      // Deleting 31 dead shadcn primitives removed ~100 near-fully-covered files from the
      // denominator, so the old statements/lines numbers were flattered by presentational
      // wrappers rather than earned by app logic. No application code got less covered.
      // Statements is re-baselined down to what the app actually sustains; functions and
      // branches are tightened to lock in the headroom that was hiding under the old gate.
      // Re-baselined a second time, on the deletion of components/ui. Same mechanism as the
      // first: the shadcn primitives were near-fully covered by dedicated a11y/interaction
      // tests, so removing them lowers the averages without any application code getting
      // worse. What remains is Klynt's own logic and screens, which is what the gate should
      // actually measure — Astryx's components live in node_modules and are its problem.
      thresholds: {
        lines: 91,
        functions: 89,
        branches: 80,
        statements: 90,
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
      // Storybook stories can be tested in a real browser via `bun run test:storybook`.
      // We keep them out of the default test run to avoid Playwright browser
      // installation and flakiness in normal development and CI.
      ...(enableStorybookBrowserTests
        ? [
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
          ]
        : []),
    ],
  },
});
