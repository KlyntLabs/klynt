import { Button } from "./button";

interface QueryErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function QueryError({
  title = "Something went wrong",
  message = "We couldn't load this data. Please try again.",
  onRetry,
}: QueryErrorProps) {
  return (
    <div className="rounded border border-red-200 bg-red-50 p-4 text-red-800">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
