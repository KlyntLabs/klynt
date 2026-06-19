import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names with Tailwind conflict resolution.
 * Use this everywhere you compose className strings.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Reusable focus-visible ring used by interactive components. */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

/** Shared disabled state for interactive components. */
export const disabledStyles = "disabled:pointer-events-none disabled:opacity-50";

/** Hard offset shadow used by NeoBrutalist components. */
export const hardShadow = "shadow-hard border-2 border-border";

/** Active/pressed offset transform for hard-shadow components. */
export const hardShadowActive =
  "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";
