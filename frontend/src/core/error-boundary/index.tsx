import { Button } from "@astryxdesign/core/Button";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";
import { useTranslation } from "react-i18next";
import { logger } from "@/core/logger";

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
  const { t } = useTranslation("errors");
  const message = error instanceof Error ? error.message : t("boundary.unknownError");

  return (
    <div className="p-6" role="alert">
      <h2 className="text-lg font-semibold">{t("boundary.title")}</h2>
      <pre className="mt-2 text-sm text-destructive">{message}</pre>
      <Button
        variant="primary"
        label={t("boundary.tryAgain")}
        onClick={resetErrorBoundary}
        className="mt-4"
      />
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
