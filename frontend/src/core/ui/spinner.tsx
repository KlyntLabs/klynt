import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface SpinnerProps {
  className?: string;
}

export function Spinner({ className }: SpinnerProps) {
  const { t } = useTranslation("ui");

  return (
    <output
      aria-label={t("spinnerLabel")}
      className={cn(
        "inline-block h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent text-foreground",
        className
      )}
    >
      <span className="sr-only">{t("spinnerLabel")}</span>
    </output>
  );
}
