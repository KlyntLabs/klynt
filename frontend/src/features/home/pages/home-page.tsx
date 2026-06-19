import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { routePaths } from "@/core/routing/route-paths";
import { Button } from "@/core/ui/button";
import { OsDesktop } from "../components/os-desktop";
import { OsWindow } from "../components/os-window";

export default function HomePage() {
  const { t } = useTranslation("home");
  const navigate = useNavigate();

  return (
    <OsDesktop windowTitle={t("topBar.windowTitle")}>
      <OsWindow title={t("topBar.windowTitle")} className="w-full max-w-2xl">
        <h1 className="mb-2 text-4xl font-extrabold text-card-foreground">{t("hero.title")}</h1>
        <p className="mb-2 text-lg font-bold text-card-foreground">{t("hero.subtitle")}</p>
        <p className="mb-6 text-card-foreground">{t("hero.body")}</p>
        <Button onClick={() => navigate(routePaths.register)} size="lg">
          {t("hero.cta")}
        </Button>
      </OsWindow>
    </OsDesktop>
  );
}
