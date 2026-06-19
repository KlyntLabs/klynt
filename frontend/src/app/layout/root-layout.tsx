import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, Outlet, useLocation } from "react-router-dom";
import { SkipLink } from "@/core/a11y/skip-link";
import { LanguageSwitcher } from "@/core/i18n/language-switcher";
import { routePaths } from "@/core/routing/route-paths";
import { useFocusOnRouteChange } from "@/core/routing/use-focus-on-route-change";

const MAIN_ID = "main-content";

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to;

  return (
    <Link
      to={to}
      aria-current={isActive ? "page" : undefined}
      className="hover:underline aria-[current=page]:font-semibold"
    >
      {children}
    </Link>
  );
}

export function RootLayout() {
  const { t } = useTranslation("common");
  const mainRef = useRef<HTMLElement>(null);
  useFocusOnRouteChange(mainRef);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SkipLink targetId={MAIN_ID} />
      <header className="border-b px-6 py-4">
        <nav className="flex items-center gap-4" aria-label={t("nav.home")}>
          <NavLink to={routePaths.home}>{t("nav.home")}</NavLink>
          <NavLink to={routePaths.dashboard}>{t("nav.dashboard")}</NavLink>
          <NavLink to={routePaths.register}>{t("nav.register")}</NavLink>
          <div className="ml-auto">
            <LanguageSwitcher />
          </div>
        </nav>
      </header>
      <main id={MAIN_ID} ref={mainRef} tabIndex={-1} className="flex flex-1 flex-col outline-none">
        <Outlet />
      </main>
    </div>
  );
}
