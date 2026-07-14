import { Heading } from "@astryxdesign/core/Heading";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useTranslation } from "react-i18next";

export default function ProfileApp() {
  const { t } = useTranslation("home");

  return (
    <Section padding={6}>
      <VStack gap={1}>
        <Heading level={1}>{t("user.profile.title")}</Heading>
        <Text as="p" type="supporting" display="block">
          {t("user.profile.description")}
        </Text>
      </VStack>
    </Section>
  );
}
