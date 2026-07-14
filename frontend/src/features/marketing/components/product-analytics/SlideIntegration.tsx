import { Badge } from "@astryxdesign/core/Badge";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { VStack } from "@astryxdesign/core/VStack";
import { useTranslation } from "react-i18next";
import styles from "./product-analytics-slides.module.css";

export function SlideIntegration() {
  const { t } = useTranslation("marketing");
  const frameworks = t("productAnalytics.slides.integration.frameworks", {
    returnObjects: true,
  }) as string[];

  const code = [
    t("productAnalytics.slides.integration.codeComment1"),
    "import { useKlynt } from '@klynt/js/react'",
    "",
    t("productAnalytics.slides.integration.codeComment2"),
    "const klynt = useKlynt()",
  ].join("\n");

  return (
    <div className={styles.integrationSlide}>
      <VStack gap={8} align="center">
        <VStack gap={6} align="center">
          <Heading level={2} justify="center">
            {t("productAnalytics.slides.integration.title")}
          </Heading>

          <HStack gap={2} wrap="wrap" justify="center" maxWidth={448}>
            {frameworks.map((framework) => (
              <Badge key={framework} variant="neutral" label={framework} />
            ))}
          </HStack>
        </VStack>

        <div className={styles.codeColumn}>
          <CodeBlock
            code={code}
            language="typescript"
            hasCopyButton={false}
            hasLanguageLabel={false}
            width="100%"
          />
        </div>
      </VStack>
    </div>
  );
}
