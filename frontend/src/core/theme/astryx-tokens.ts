/**
 * Read Astryx spacing tokens as JS numbers, for the few places that need a spacing value in
 * arithmetic (`Math.max`, `innerHeight - x`, `outer - 2*padding`) where a CSS `var()` cannot go.
 *
 * The value flows from the live `--spacing-<step>` token on the document root — it is not a copy.
 * The fallback map mirrors what @astryxdesign/theme-neutral ships (0…12 = 0…48px, 4px/step) and is
 * used only where the stylesheet can't be read (jsdom/SSR). Re-check on an Astryx bump.
 *
 * This is the spacing analogue of `core/motion/astryx-motion.ts`, which does the same for the
 * duration/easing tokens.
 */

export type SpacingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/** theme-neutral ships `--spacing-<n>` = n × 4px. Fallback only — the live token is preferred. */
const SPACING_STEP_PX = 4;

/** Resolve `--spacing-<step>` off the document root, in px. */
export function spacingPx(step: SpacingStep): number {
  const fallback = step * SPACING_STEP_PX;
  if (typeof document === "undefined" || !document.documentElement) return fallback;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(`--spacing-${step}`)
    .trim();
  const px = Number.parseFloat(raw); // "40px" -> 40
  return Number.isFinite(px) && px >= 0 ? px : fallback;
}
