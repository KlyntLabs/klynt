import { defineTheme } from "@astryxdesign/core/theme";

/**
 * Klynt's Astryx theme. The color scale is derived from the brand orange
 * via Astryx's HCT model; explicit `tokens` entries override where the
 * derivation is wrong. Keep this the single source of brand token truth —
 * the old --color-brand* custom properties were removed from index.css.
 */
export const klyntTheme = defineTheme({
  name: "klynt",
  color: { accent: "#f76e18" },
  tokens: {
    // Add [light, dark] tuple overrides here only when the HCT-derived
    // value is visibly wrong. Start empty; refine during marketing migration.
  },
});
