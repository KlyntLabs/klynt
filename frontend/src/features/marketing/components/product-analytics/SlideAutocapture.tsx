import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
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
    <HStack height="100%" paddingInline={8} gap={8} align="center">
      <VStack gap={4} align="start" className={styles.column}>
        <Heading level={2}>{t("productAnalytics.slides.autocapture.title")}</Heading>
        <Text color="secondary" display="block">
          {t("productAnalytics.slides.autocapture.body")}
        </Text>
        <List density="compact">
          {items.map((item) => (
            <ListItem
              key={item}
              label={item}
              startContent={
                /* `color="green"` resolves to the same --color-icon-green the old CSS rule set,
                   and `sm` replaces its hand-written 14px. Both are now props. */
                <Icon icon={Check} size="sm" color="green" className={styles.checkIcon} />
              }
            />
          ))}
        </List>
        <Text color="secondary" display="block">
          {t("productAnalytics.slides.autocapture.footer")}
        </Text>
      </VStack>

      <HStack align="center" justify="center" className={styles.visualColumn}>
        <CodeBlock
          code={code}
          language="javascript"
          hasCopyButton={false}
          hasLanguageLabel={false}
          width="100%"
        />
      </HStack>
    </HStack>
  );
}
