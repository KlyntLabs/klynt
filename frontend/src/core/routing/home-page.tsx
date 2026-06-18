import { useTranslation } from "react-i18next";

export default function HomePage() {
  const { t } = useTranslation("common");
  return <div className="p-6">{t("nav.home")}</div>;
}
