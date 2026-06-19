import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
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
        "rounded-lg border-2 border-destructive bg-card p-4 text-card-foreground shadow-hard",
        className
      )}
    >
      <h3 className="font-bold text-destructive">{title ?? t("queryError.title")}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{message ?? t("queryError.message")}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          {t("queryError.retry")}
        </Button>
      )}
    </div>
  );
}
