import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { navigateExternal } from "@/core/auth/external-redirect";
import { buildApexUrl } from "@/core/routing/subdomain-router";

const REDIRECT_DELAY_MS = 5000;

export function InvalidTenantPage() {
  const { t } = useTranslation(["errors"]);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigateExternal(buildApexUrl("/"));
    }, REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold">{t("errors:systemInvalid")}</h1>
      <p className="text-muted-foreground">{t("errors:systemInvalidRedirect")}</p>
    </div>
  );
}
