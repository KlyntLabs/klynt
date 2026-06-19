import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { routePaths } from "@/core/routing/route-paths";
import { buttonVariants } from "@/core/ui/button";
import { cn, focusRing } from "@/lib/utils";
import { OsDesktop } from "../components/os-desktop";
import { OsWindow } from "../components/os-window";

export default function HomePage() {
  const { t } = useTranslation("home");

  return (
    <OsDesktop>
      <OsWindow title={t("topBar.windowTitle")} className="w-full max-w-2xl">
        <h1 className="mb-2 text-4xl font-extrabold text-card-foreground">{t("hero.title")}</h1>
        <p className="mb-2 text-lg font-bold text-card-foreground">{t("hero.subtitle")}</p>
        <p className="mb-6 text-card-foreground">{t("hero.body")}</p>
        <Link
          to={routePaths.register}
          data-testid="hero-cta"
          className={cn(buttonVariants({ size: "lg" }), focusRing)}
        >
          {t("hero.cta")}
        </Link>
      </OsWindow>
    </OsDesktop>
  );
}
