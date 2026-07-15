import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Section } from "@astryxdesign/core/Section";
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
    <Section variant="transparent" padding={6}>
      <Banner
        status="error"
        role="alert"
        title={t("boundary.title")}
        description={message}
        endContent={
          <Button variant="primary" label={t("boundary.tryAgain")} onClick={resetErrorBoundary} />
        }
      />
    </Section>
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
