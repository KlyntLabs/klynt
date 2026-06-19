import { MessageCircle, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LanguageSwitcher } from "@/core/i18n/language-switcher";
import { routePaths } from "@/core/routing/route-paths";
import { buttonVariants } from "@/core/ui/button";
import { KlyntLogo } from "@/core/ui/logo";
import { cn, focusRing } from "@/lib/utils";

function LogoMenu() {
  const { t } = useTranslation("home");

  return (
    <details className="group relative">
      <summary
        data-testid="logo-menu"
        className={cn(
          "flex list-none cursor-pointer items-center justify-center rounded p-1 text-foreground transition-transform hover:translate-x-[1px] hover:translate-y-[1px]",
          "[&::-webkit-details-marker]:hidden",
          focusRing
        )}
        aria-label={t("topBar.startLabel")}
      >
        <KlyntLogo className="h-5 w-5" />
      </summary>
      <nav
        aria-label={t("topBar.menu.label")}
        className="absolute top-full left-0 z-50 mt-1 min-w-[12rem] rounded-lg border-2 border-border bg-background p-1 shadow-hard"
      >
        <Link
          to={routePaths.home}
          className="block rounded px-3 py-2 text-sm font-bold text-foreground hover:bg-primary/20 focus-visible:bg-primary/20 focus-visible:outline-none"
        >
          {t("topBar.menu.about")}
        </Link>
        <Link
          to={routePaths.register}
          className="block rounded px-3 py-2 text-sm font-bold text-foreground hover:bg-primary/20 focus-visible:bg-primary/20 focus-visible:outline-none"
        >
          {t("topBar.menu.register")}
        </Link>
        <Link
          to={routePaths.dashboard}
          className="block rounded px-3 py-2 text-sm font-bold text-foreground hover:bg-primary/20 focus-visible:bg-primary/20 focus-visible:outline-none"
        >
          {t("topBar.menu.dashboard")}
        </Link>
      </nav>
    </details>
  );
}

function NavMenu({ label }: { label: string }) {
  const { t } = useTranslation("home");

  return (
    <details className="group relative">
      <summary
        className={cn(
          "list-none cursor-pointer rounded px-2 py-1 text-xs font-bold text-primary-foreground hover:bg-primary-foreground/10",
          "[&::-webkit-details-marker]:hidden",
          focusRing
        )}
      >
        {label}
      </summary>
      <div
        role="menu"
        aria-label={label}
        className="absolute top-full left-0 z-50 mt-1 min-w-[10rem] rounded-lg border-2 border-border bg-background p-1 shadow-hard"
      >
        <button
          type="button"
          disabled
          role="menuitem"
          className="w-full rounded px-3 py-2 text-left text-sm font-bold text-muted-foreground"
        >
          {t("topBar.nav.placeholder")}
        </button>
      </div>
    </details>
  );
}

function IconButton({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        "flex items-center justify-center rounded p-1 text-primary-foreground transition-transform hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none",
        focusRing
      )}
    >
      {children}
    </button>
  );
}

export function OsTopBar() {
  const { t } = useTranslation("home");

  return (
    <div className="flex h-8 items-center justify-between gap-3 border-b-2 border-border bg-primary px-2 text-primary-foreground">
      <div className="flex items-center gap-1">
        <LogoMenu />
        <NavMenu label={t("topBar.nav.docs")} />
        <NavMenu label={t("topBar.nav.community")} />
        <NavMenu label={t("topBar.nav.courses")} />
        <NavMenu label={t("topBar.nav.teachers")} />
      </div>

      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <Link to={routePaths.register} className={cn(buttonVariants({ size: "sm" }), focusRing)}>
          {t("topBar.actions.getStarted")}
        </Link>
        <Link
          to={routePaths.dashboard}
          aria-label={t("topBar.actions.user")}
          className={cn(
            "flex items-center justify-center rounded p-1 text-primary-foreground transition-transform hover:translate-x-[1px] hover:translate-y-[1px]",
            focusRing
          )}
        >
          <User className="h-5 w-5" />
        </Link>
        <IconButton label={t("topBar.actions.chat")}>
          <MessageCircle className="h-5 w-5" />
        </IconButton>
      </div>
    </div>
  );
}
