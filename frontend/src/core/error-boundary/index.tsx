import { logger } from "@/core/logger";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

function Fallback({
  error,
  resetErrorBoundary,
}: {
  error: unknown;
  resetErrorBoundary: () => void;
}) {
  const message = error instanceof Error ? error.message : "Unknown error";
  return (
    <div className="p-6" role="alert">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <pre className="mt-2 text-sm text-red-600">{message}</pre>
      <button
        type="button"
        onClick={resetErrorBoundary}
        className="mt-4 rounded bg-slate-900 px-4 py-2 text-white"
      >
        Try again
      </button>
    </div>
  );
}

export function ErrorBoundary({ children }: ErrorBoundaryProps) {
  return (
    <ReactErrorBoundary
      FallbackComponent={Fallback}
      onError={(error, info) => {
        logger.error("Uncaught render error", {
          error: error instanceof Error ? error.message : String(error),
          componentStack: info.componentStack,
        });
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
}
