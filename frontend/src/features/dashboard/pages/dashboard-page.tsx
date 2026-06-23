import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TenantSwitcher } from "@/features/tenant";

export default function DashboardPage() {
  const { t } = useTranslation("ui");

  return (
    <div className="p-6">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <TenantSwitcher />
      </header>
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.title")}</CardTitle>
          <CardDescription>{t("dashboard.welcome")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t("dashboard.placeholder")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
