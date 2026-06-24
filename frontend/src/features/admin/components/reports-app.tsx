import { useTranslation } from "react-i18next";

export default function ReportsApp() {
  const { t } = useTranslation("home");

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">{t("admin.reports.title")}</h1>
      <p className="text-muted-foreground">{t("admin.reports.description")}</p>
    </div>
  );
}
