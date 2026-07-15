import type { Transition } from "framer-motion";

/**
 * framer-motion timing, sourced from Astryx's motion tokens.
 *
 * The two systems don't interoperate directly: framer-motion needs JS numbers (duration in
 * *seconds*) and a bezier *array*, while Astryx ships CSS custom properties (`--duration-*` in ms,
 * `--ease-standard` as a `cubic-bezier(...)` string). So the timing here is not hardcoded — it is
 * *read off the live token* on the document root and reshaped for framer-motion. The `*_FALLBACK`
 * values mirror Astryx 0.1.5's shipped values and are used ONLY where the stylesheet can't be read
 * (jsdom/SSR); in a real browser the token always wins. Re-check the fallbacks on an Astryx bump.
 *
 * This is the single source of motion timing for every framer-motion animation in the app. Do not
 * write a raw `duration`/`ease` into a `transition` — reach for `tween()` / `easeStandard()`.
 *
 * Scope, and the honest edges:
 *  - `delay` / stagger amounts are *choreography* (when a thing starts in a sequence), not a design
 *    token — Astryx ships no delay/stagger token. Pass them through `tween(band, { delay })`.
 *  - Spring physics (`type: "spring"`) has no Astryx token: Astryx's motion model is tween-only
 *    (duration + easing). The few springs left are documented exceptions at their call sites.
 */

/**
 * Fallback only — the live token is preferred; this is used only where the stylesheet can't be read
 * (jsdom/SSR). These mirror what @astryxdesign/theme-neutral 0.1.5 *actually ships*
 * (`dist/theme.css`), which is NOT what Astryx's `docs motion` page lists — the doc quotes a
 * different, slower scale (175/410/975). Trust the shipped token, not the doc. Verified against the
 * live browser value. Re-check on an Astryx bump.
 */
const DURATION_FALLBACK_MS = {
  "fast-min": 95,
  fast: 125,
  "fast-max": 165,
  "medium-min": 225,
  medium: 300,
  "medium-max": 400,
  "slow-min": 525,
  slow: 700,
  "slow-max": 935,
} as const;
/** Astryx 0.1.5 `--ease-standard` = cubic-bezier(0.24, 1, 0.4, 1). Fallback only. */
const EASE_STANDARD_FALLBACK: readonly [number, number, number, number] = [0.24, 1, 0.4, 1];

export type MotionBand = keyof typeof DURATION_FALLBACK_MS;

function root(): HTMLElement | null {
  return typeof document !== "undefined" ? document.documentElement : null;
}

/** Read `--duration-<band>` off the root and return it in seconds (framer-motion's unit). */
function durationSeconds(band: MotionBand): number {
  const el = root();
  const fallback = DURATION_FALLBACK_MS[band];
  if (!el) return fallback / 1000;
  const raw = getComputedStyle(el).getPropertyValue(`--duration-${band}`).trim();
  const ms = Number.parseFloat(raw); // "410ms" -> 410
  return (Number.isFinite(ms) && ms > 0 ? ms : fallback) / 1000;
}

/** Read `--ease-standard` off the root and return it as a framer-motion bezier array. */
export function easeStandard(): [number, number, number, number] {
  const el = root();
  const fallback: [number, number, number, number] = [...EASE_STANDARD_FALLBACK];
  if (!el) return fallback;
  const raw = getComputedStyle(el).getPropertyValue("--ease-standard").trim();
  const m = raw.match(
    /cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)/
  );
  if (!m) return fallback;
  const nums = m.slice(1, 5).map(Number) as [number, number, number, number];
  return nums.every(Number.isFinite) ? nums : fallback;
}

/**
 * A tween transition whose `duration` and `ease` come from Astryx's motion tokens.
 * `band` picks the duration primitive (fast = micro-interaction, medium = entrance/exit,
 * slow = continuous). Pass choreography — `delay`, `repeat`, `times` — via `extra`.
 */
export function tween(
  band: MotionBand = "medium",
  extra?: Omit<Transition, "duration" | "ease" | "type">
): Transition {
  return { type: "tween", duration: durationSeconds(band), ease: easeStandard(), ...extra };
}
