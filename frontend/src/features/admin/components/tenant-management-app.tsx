import { useTranslation } from "react-i18next";

export default function TenantManagementApp() {
  const { t } = useTranslation("home");

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">{t("admin.tenantManagement.title")}</h1>
      <p className="text-muted-foreground">{t("admin.tenantManagement.description")}</p>
    </div>
  );
}
