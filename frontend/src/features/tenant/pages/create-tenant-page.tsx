import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { navigateExternal } from "@/core/auth/external-redirect";
import { buildAdminUrl } from "@/core/routing/subdomain-router";
import { CreateTenantForm } from "../components/CreateTenantForm";

export default function CreateTenantPage() {
  const { t } = useTranslation("ui");

  return (
    <div className="p-6 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{t("tenant.createTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateTenantForm onSuccess={() => navigateExternal(buildAdminUrl())} />
        </CardContent>
      </Card>
    </div>
  );
}
