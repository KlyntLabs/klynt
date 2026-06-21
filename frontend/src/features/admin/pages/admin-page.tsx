import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminPage() {
  const { t } = useTranslation("ui");

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.title")}</CardTitle>
          <CardDescription>{t("admin.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t("admin.placeholder")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
