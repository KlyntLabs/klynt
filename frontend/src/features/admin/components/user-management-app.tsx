import { useTranslation } from "react-i18next";

export default function UserManagementApp() {
  const { t } = useTranslation("home");

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">{t("admin.userManagement.title")}</h1>
      <p className="text-muted-foreground">{t("admin.userManagement.description")}</p>
    </div>
  );
}
