import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface SkipLinkProps {
  targetId: string;
  className?: string;
}

export function SkipLink({ targetId, className }: SkipLinkProps) {
  const { t } = useTranslation("ui");

  return (
    <a
      href={`#${targetId}`}
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground",
        className
      )}
    >
      {t("skipLink")}
    </a>
  );
}
