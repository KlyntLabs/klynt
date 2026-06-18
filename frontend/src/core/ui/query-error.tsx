import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { Button } from "./button";

interface QueryErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function QueryError({ title, message, onRetry, className }: QueryErrorProps) {
  const { t } = useTranslation("ui");

  return (
    <div
      className={cn(
        "rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive-foreground",
        className
      )}
    >
      <h3 className="font-semibold">{title ?? t("queryError.title")}</h3>
      <p className="mt-1 text-sm opacity-90">{message ?? t("queryError.message")}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          {t("queryError.retry")}
        </Button>
      )}
    </div>
  );
}
