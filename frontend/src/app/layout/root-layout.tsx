import { LanguageSwitcher } from "@/core/i18n/language-switcher";
import { routePaths } from "@/core/routing/route-paths";
import { useFocusOnRouteChange } from "@/core/routing/use-focus-on-route-change";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, Outlet } from "react-router-dom";

export function RootLayout() {
  const { t } = useTranslation("common");
  const mainRef = useRef<HTMLElement>(null);
  useFocusOnRouteChange(mainRef);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b px-6 py-4">
        <nav className="flex items-center gap-4">
          <Link to={routePaths.home} className="font-semibold hover:underline">
            {t("nav.home")}
          </Link>
          <Link to={routePaths.dashboard} className="hover:underline">
            {t("nav.dashboard")}
          </Link>
          <Link to={routePaths.register} className="hover:underline">
            {t("nav.register")}
          </Link>
          <div className="ml-auto">
            <LanguageSwitcher />
          </div>
        </nav>
      </header>
      <main ref={mainRef} tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
