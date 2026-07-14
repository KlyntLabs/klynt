import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useTranslation } from "react-i18next";

export function DataStackSection() {
  const { t } = useTranslation("marketing");
  const dataStackItems = t("home.dataStack.items", { returnObjects: true }) as unknown as string[];

  return (
    <Section variant="transparent" padding={0} paddingBlock={6} dividers={["top"]}>
      <VStack gap={4} align="start">
        <VStack gap={3} align="start">
          <Heading level={2}>{t("home.dataStack.title")}</Heading>
          <Text type="large" color="secondary" display="block">
            {t("home.dataStack.body1")}
          </Text>
          <Text type="supporting" display="block">
            {t("home.dataStack.body2")}
          </Text>
          <Text type="supporting" display="block">
            {t("home.dataStack.body3")}
          </Text>
        </VStack>

        <VStack as="ul" gap={1.5} align="start">
          {dataStackItems.map((item) => (
            <HStack as="li" key={item} gap={3} align="center">
              {/*
               * The "included" tick is a brand mark rather than a themed control: the geometry is
               * fixed and the plate is the accent. Both fills are drawn from tokens so the mark
               * tracks the theme in both colour modes.
               */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 32 32"
                fill="none"
                aria-label={t("home.dataStack.includedAlt")}
              >
                <title>{t("home.dataStack.includedAlt")}</title>
                <rect width="32" height="32" rx="6" fill="var(--color-accent)" />
                <path
                  d="M8 16l6 6 10-10"
                  stroke="var(--color-on-accent)"
                  strokeWidth="3"
                  fill="none"
                />
              </svg>
              <Text type="label" weight="medium">
                {item}
              </Text>
            </HStack>
          ))}
        </VStack>

        <Button variant="ghost" size="sm" label={t("home.dataStack.readmeLink")} />
      </VStack>
    </Section>
  );
}
