import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
}

export function Spinner({ className }: SpinnerProps) {
  return (
    <output
      aria-label="Loading"
      className={cn(
        "inline-block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
    >
      <span className="sr-only">Loading</span>
    </output>
  );
}
