import { Heading } from "@astryxdesign/core/Heading";
import { Section } from "@astryxdesign/core/Section";
import { VStack } from "@astryxdesign/core/VStack";
import { useTranslation } from "react-i18next";
import { navigateExternal } from "@/core/auth/external-redirect";
import { buildAdminUrl } from "@/core/routing/subdomain-router";
import { CreateTenantForm } from "../components/CreateTenantForm";

export default function CreateTenantPage() {
  const { t } = useTranslation("ui");

  return (
    <Section maxWidth={448}>
      <VStack gap={4}>
        <Heading level={1}>{t("tenant.createTitle")}</Heading>
        <CreateTenantForm onSuccess={() => navigateExternal(buildAdminUrl())} />
      </VStack>
    </Section>
  );
}
