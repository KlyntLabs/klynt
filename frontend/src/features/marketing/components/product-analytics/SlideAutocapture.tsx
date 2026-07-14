import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Heading } from "@astryxdesign/core/Heading";
import { List, ListItem } from "@astryxdesign/core/List";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import styles from "./product-analytics-slides.module.css";

export function SlideAutocapture() {
  const { t } = useTranslation("marketing");
  const items = t("productAnalytics.slides.autocapture.items", {
    returnObjects: true,
  }) as string[];

  const code = [
    t("productAnalytics.slides.autocapture.codeComment1"),
    "klynt.init('YOUR_API_KEY')",
    "",
    t("productAnalytics.slides.autocapture.codeComment2"),
  ].join("\n");

  return (
    <div className={styles.autocaptureSlide}>
      <div className={styles.column}>
        <VStack gap={4} align="start">
          <Heading level={2}>{t("productAnalytics.slides.autocapture.title")}</Heading>
          <Text color="secondary" display="block">
            {t("productAnalytics.slides.autocapture.body")}
          </Text>
          <List density="compact">
            {items.map((item) => (
              <ListItem
                key={item}
                label={item}
                startContent={<Check className={styles.checkIcon} aria-hidden="true" />}
              />
            ))}
          </List>
          <Text color="secondary" display="block">
            {t("productAnalytics.slides.autocapture.footer")}
          </Text>
        </VStack>
      </div>

      <div className={styles.visualColumn}>
        <CodeBlock
          code={code}
          language="javascript"
          hasCopyButton={false}
          hasLanguageLabel={false}
          width="100%"
        />
      </div>
    </div>
  );
}
