import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  const { t } = useTranslation("ui");

  return (
    <div className="p-6">
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
