import { Center } from "@astryxdesign/core/Center";
import { EmptyState } from "@astryxdesign/core/EmptyState";
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
    <Center height="100vh">
      <EmptyState
        headingLevel={1}
        title={t("errors:systemInvalid")}
        description={t("errors:systemInvalidRedirect")}
      />
    </Center>
  );
}
