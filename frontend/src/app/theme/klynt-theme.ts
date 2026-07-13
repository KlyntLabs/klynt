import { defineTheme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral";

/**
 * Klynt's Astryx theme.
 *
 * The brand accent is the Klynt orange the desktop already uses (`--color-brand`, #f76e18).
 * It is declared here rather than by overriding `--color-*` in `:root`, which Astryx
 * forbids: the token pipeline derives a whole palette (hover/active/on-accent/borders, in
 * both color modes) from the accent via HCT, and a raw override would desync those.
 *
 * Light/dark pairs are supplied as [light, dark] tuples. The dark value is lifted slightly
 * so the accent keeps its contrast against dark surfaces once dark mode is enabled — see
 * docs/astryx-migration-plan.md, Phase 5, where Theme's mode flips from "light" to "system".
 */
export const klyntTheme = defineTheme({
  name: "klynt",
  extends: neutralTheme,
  color: { accent: "#f76e18", neutralStyle: "warm" },
  tokens: {
    "--color-accent": ["#f76e18", "#ff8a3d"],
  },
});
