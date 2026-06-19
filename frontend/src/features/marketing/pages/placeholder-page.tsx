import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { routePaths } from "@/core/routing/route-paths";
import { buttonVariants } from "@/core/ui/button";
import { OsWindow } from "@/features/home/components/os-window";
import { cn } from "@/lib/utils";

export default function PlaceholderPage() {
  const { t } = useTranslation("common");

  return (
    <div className="flex min-h-screen flex-col bg-secondary p-4">
      <div className="flex flex-1 items-center justify-center">
        <OsWindow title="klynt-app.mdx" className="w-full max-w-md">
          <h1 className="mb-4 text-2xl font-extrabold">{t("comingSoon.title")}</h1>
          <p className="mb-6 text-foreground">This feature is launching soon.</p>
          <Link to={routePaths.home} className={cn(buttonVariants(), "inline-flex")}>
            {t("comingSoon.back")}
          </Link>
        </OsWindow>
      </div>
    </div>
  );
}
