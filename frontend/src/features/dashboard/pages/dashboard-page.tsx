import { useTranslation } from "react-i18next";

export default function DashboardPage() {
  const { t } = useTranslation("ui");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">{t("dashboard.title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("dashboard.welcome")}</p>
    </div>
  );
}
