import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { routePaths } from "@/core/routing/route-paths";

export default function NotFoundPage() {
  const { t } = useTranslation("ui");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{t("notFound.title")}</h1>
      <Link to={routePaths.home} className="mt-4 inline-block text-primary hover:underline">
        {t("notFound.goHome")}
      </Link>
    </div>
  );
}
