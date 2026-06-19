import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LanguageSwitcher } from "@/core/i18n/language-switcher";
import { routePaths } from "@/core/routing/route-paths";
import { KlyntLogo } from "@/core/ui/logo";
import { cn, focusRing } from "@/lib/utils";

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
    <div className="flex h-8 items-center gap-3 border-b-2 border-border bg-primary px-2 text-primary-foreground">
      <Link
        to={routePaths.home}
        aria-label={t("topBar.startLabel")}
        className={cn(
          "flex items-center justify-center rounded p-1 text-foreground transition-transform hover:translate-x-[1px] hover:translate-y-[1px]",
          focusRing
        )}
      >
        <KlyntLogo className="h-5 w-5" />
      </Link>
      <span className="flex-1 truncate text-center text-xs font-bold">{windowTitle}</span>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <span aria-live="off" className="text-[10px] font-bold tabular-nums">
          {time}
        </span>
      </div>
    </div>
  );
}
