import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateTenantForm } from "../components/CreateTenantForm";

export default function CreateTenantPage() {
  const { t } = useTranslation("ui");
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{t("tenant.createTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateTenantForm onSuccess={() => navigate("/dashboard")} />
        </CardContent>
      </Card>
    </div>
  );
}
