import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * GlassPanel — reusable glassmorphism container inspired by macOS Tahoe.
 *
 * All variants share the same recipe: a translucent background, backdrop
 * blur, a 1px border, and an inset top-edge highlight. Variants control
 * opacity, blur intensity, border colour, elevation shadow, and radius.
 *
 * Use `flat` for inline panels, `elevated` for floating cards,
 * `topbar` for the macOS menu bar, and `dropdown` for popover menus.
 */
const glassPanelVariants = cva(
  [
    "relative border backdrop-blur-xl",
    "before:absolute before:inset-x-0 before:top-0 before:h-px before:rounded-t-inherit",
  ],
  {
    variants: {
      variant: {
        flat: ["bg-glass/60 border-glass-border/60", "before:bg-glass-highlight/30"],
        elevated: [
          "bg-glass/70 border-glass-border/50 shadow-elevation-3",
          "before:bg-glass-highlight/40",
        ],
        topbar: ["bg-glass/80 border-glass-border/50", "before:bg-glass-highlight/40"],
        dropdown: [
          "bg-glass-strong/85 border-glass-border/60 shadow-elevation-4",
          "before:bg-glass-highlight/50",
        ],
      },
      radius: {
        sm: "rounded-lg",
        md: "rounded-xl",
        lg: "rounded-2xl",
        xl: "rounded-3xl",
        none: "rounded-none",
      },
    },
    defaultVariants: {
      variant: "flat",
      radius: "lg",
    },
  }
);

export type GlassPanelProps = React.ComponentProps<"div"> & VariantProps<typeof glassPanelVariants>;

export function GlassPanel({ className, variant, radius, ...props }: GlassPanelProps) {
  return (
    <div
      data-slot="glass-panel"
      className={cn(glassPanelVariants({ variant, radius }), className)}
      {...props}
    />
  );
}

/**
 * GlassDivider — thin separator used inside glass containers.
 * Subtle gradient stroke that blends with the glass surface.
 */
export function GlassDivider({ className }: { className?: string }) {
  return (
    <div
      data-slot="glass-divider"
      className={cn(
        "my-1 h-px bg-gradient-to-r from-transparent via-glass-border/60 to-transparent",
        className
      )}
    />
  );
}

export { glassPanelVariants };
