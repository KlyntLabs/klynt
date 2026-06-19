import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border-2 px-2.5 py-0.5 text-xs font-bold transition-all",
  {
    variants: {
      variant: {
        default: "border-border bg-primary text-primary-foreground shadow-hard-sm",
        secondary: "border-border bg-secondary text-secondary-foreground shadow-hard-sm",
        destructive: "border-border bg-destructive text-destructive-foreground shadow-hard-sm",
        outline: "border-border bg-background text-foreground shadow-hard-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  ref?: React.Ref<HTMLDivElement>;
}

export function Badge({ className, variant, ref, ...props }: BadgeProps) {
  return <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
}
