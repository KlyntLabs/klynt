import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { useTranslation } from "react-i18next";
import styles from "./mobile-fallback.module.css";

export function MobileFallback() {
  const { t } = useTranslation("home");
  return (
    <div className={styles.screen}>
      <div className={styles.panel}>
        <VStack gap={4} align="center">
          <Heading level={1} justify="center">
            {t("desktop.mobileFallback.title")}
          </Heading>
          <Text as="p" display="block" color="secondary" justify="center">
            {t("desktop.mobileFallback.message")}
          </Text>
        </VStack>
      </div>
    </div>
  );
}
