import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => {
    const clampedValue = Math.min(Math.max(value, 0), max);
    const percentage = max > 0 ? (clampedValue / max) * 100 : 0;

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={clampedValue}
        className={cn(
          "relative h-4 w-full overflow-hidden rounded-full border-2 border-border bg-muted shadow-hard-sm",
          className
        )}
        {...props}
      >
        <div className="h-full bg-primary transition-all" style={{ width: `${percentage}%` }} />
      </div>
    );
  }
);
Progress.displayName = "Progress";
