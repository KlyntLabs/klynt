import { useTranslation } from "react-i18next";

export default function MyCoursesApp() {
  const { t } = useTranslation("home");

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">{t("user.myCourses.title")}</h1>
      <p className="text-muted-foreground">{t("user.myCourses.description")}</p>
    </div>
  );
}
