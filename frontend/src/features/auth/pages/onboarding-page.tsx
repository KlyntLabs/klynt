import { Center } from "@astryxdesign/core/Center";
import { Heading } from "@astryxdesign/core/Heading";
import { Section } from "@astryxdesign/core/Section";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { navigateExternal } from "@/core/auth/external-redirect";
import { buildAdminUrl } from "@/core/routing/subdomain-router";
import { CreateTenantForm } from "@/features/tenant";
import { JoinTenantForm } from "../components/join-tenant-form";

export default function OnboardingPage() {
  const { t } = useTranslation("auth");
  const [mode, setMode] = useState<"create" | "join">("create");

  const handleSuccess = () => navigateExternal(buildAdminUrl());

  return (
    <Center height="100vh">
      <Section maxWidth={448}>
        <VStack gap={4}>
          <VStack gap={1}>
            <Heading level={1}>{t("onboarding.title")}</Heading>
            <Text type="supporting">{t("onboarding.subtitle")}</Text>
          </VStack>

          {/* SegmentedControl, not TabList: these are two mutually exclusive modes of one
              task, not page navigation — exactly the distinction Astryx draws between them. */}
          <SegmentedControl
            label={t("onboarding.title")}
            layout="fill"
            value={mode}
            onChange={(value) => setMode(value as "create" | "join")}
          >
            <SegmentedControlItem value="create" label={t("onboarding.createTab")} />
            <SegmentedControlItem value="join" label={t("onboarding.joinTab")} />
          </SegmentedControl>

          {mode === "create" ? (
            <CreateTenantForm onSuccess={handleSuccess} />
          ) : (
            <JoinTenantForm onSuccess={handleSuccess} />
          )}
        </VStack>
      </Section>
    </Center>
  );
}
