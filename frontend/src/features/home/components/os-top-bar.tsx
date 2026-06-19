import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LanguageSwitcher } from "@/core/i18n/language-switcher";
import { routePaths } from "@/core/routing/route-paths";
import { cn, focusRing, hardShadowActive } from "@/lib/utils";

interface OsTopBarProps {
  windowTitle: string;
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "numeric",
  }).format(date);
}

export function OsTopBar({ windowTitle }: OsTopBarProps) {
  const { t } = useTranslation("home");
  const [time, setTime] = useState(() => formatTime(new Date()));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(formatTime(new Date()));
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-11 items-center gap-3 border-b-2 border-border bg-primary px-3 text-primary-foreground">
      <Link
        to={routePaths.home}
        className={cn(
          "flex h-full items-center justify-center rounded bg-background px-3 text-sm font-bold text-foreground shadow-hard-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none",
          hardShadowActive,
          focusRing
        )}
      >
        {t("topBar.startLabel")}
      </Link>
      <span className="flex-1 truncate text-center text-sm font-bold">{windowTitle}</span>
      <div className="flex items-center gap-3">
        <LanguageSwitcher className="text-primary-foreground" />
        <span aria-live="off" className="text-xs font-bold">
          {time}
        </span>
      </div>
    </div>
  );
}
