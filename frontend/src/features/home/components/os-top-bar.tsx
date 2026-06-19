import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { routePaths } from "@/core/routing/route-paths";
import { cn, focusRing, hardShadowActive } from "@/lib/utils";

interface OsTopBarProps {
  windowTitle: string;
}

export function OsTopBar({ windowTitle }: OsTopBarProps) {
  const { t } = useTranslation("home");
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "numeric",
  }).format(new Date());

  return (
    <div className="flex h-10 items-center gap-3 border-b-2 border-border bg-primary px-3 text-primary-foreground">
      <Link
        to={routePaths.home}
        className={cn(
          "rounded bg-background px-2 py-0.5 text-sm font-bold text-foreground shadow-hard-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none",
          hardShadowActive,
          focusRing
        )}
      >
        {t("topBar.startLabel")}
      </Link>
      <span className="flex-1 truncate text-center text-sm font-bold">{windowTitle}</span>
      <span aria-live="polite" className="text-xs font-bold">
        {time}
      </span>
    </div>
  );
}
