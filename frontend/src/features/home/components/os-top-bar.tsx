import { MessageCircle, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LanguageSwitcher } from "@/core/i18n/language-switcher";
import { routePaths } from "@/core/routing/route-paths";
import { buttonVariants } from "@/core/ui/button";
import { KlyntLogo } from "@/core/ui/logo";
import { cn, focusRing } from "@/lib/utils";

function LogoMenu() {
  const { t } = useTranslation("home");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("topBar.startLabel")}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex items-center justify-center rounded p-1 text-foreground transition-transform hover:translate-x-[1px] hover:translate-y-[1px]",
          focusRing
        )}
      >
        <KlyntLogo className="h-5 w-5" />
      </button>
      {open && (
        <nav
          aria-label={t("topBar.startLabel")}
          className="absolute top-full left-0 z-50 mt-1 min-w-[12rem] rounded-lg border-2 border-border bg-background p-1 shadow-hard"
        >
          <Link
            to={routePaths.home}
            className="block rounded px-3 py-2 text-sm font-bold text-foreground hover:bg-primary/20 focus-visible:bg-primary/20 focus-visible:outline-none"
          >
            {t("topBar.menu.about")}
          </Link>
          <Link
            to={routePaths.docs}
            className="block rounded px-3 py-2 text-sm font-bold text-foreground hover:bg-primary/20 focus-visible:bg-primary/20 focus-visible:outline-none"
          >
            {t("topBar.menu.docs")}
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
      )}
    </div>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded px-2 py-1 text-xs font-bold text-primary-foreground hover:bg-primary-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
    >
      {children}
    </Link>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
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
        <NavLink to={routePaths.docs}>{t("topBar.nav.docs")}</NavLink>
        <NavLink to={routePaths.community}>{t("topBar.nav.community")}</NavLink>
        <NavLink to={routePaths.courses}>{t("topBar.nav.courses")}</NavLink>
        <NavLink to={routePaths.teachers}>{t("topBar.nav.teachers")}</NavLink>
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
