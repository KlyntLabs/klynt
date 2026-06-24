import { useTranslation } from "react-i18next";

export function MobileFallback() {
  const { t } = useTranslation("home");
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background p-6 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-semibold">{t("desktop.mobileFallback.title")}</h1>
        <p className="text-muted-foreground">{t("desktop.mobileFallback.message")}</p>
      </div>
    </div>
  );
}
