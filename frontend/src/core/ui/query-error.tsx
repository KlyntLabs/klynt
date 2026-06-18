import { cn } from "@/lib/utils";
import { Button } from "./button";

interface QueryErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function QueryError({
  title = "Something went wrong",
  message = "We couldn't load this data. Please try again.",
  onRetry,
  className,
}: QueryErrorProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive-foreground",
        className
      )}
    >
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm opacity-90">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
