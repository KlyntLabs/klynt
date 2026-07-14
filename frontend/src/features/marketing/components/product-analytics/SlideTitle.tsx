import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import styles from "./product-analytics-slides.module.css";

export function SlideTitle() {
  const { t } = useTranslation("marketing");

  return (
    <div className={styles.titleSlide}>
      <VStack gap={6} align="center">
        <div className={styles.brandPlate}>
          <BarChart3 className={styles.brandPlateIcon} aria-hidden="true" />
        </div>

        <VStack gap={3} align="center">
          <Heading level={1} type="display-3" justify="center" textWrap="balance">
            {t("productAnalytics.slides.title.title")}
          </Heading>
          <VStack gap={2} align="center">
            <Text type="large" color="secondary" display="block" justify="center">
              {t("productAnalytics.slides.title.subtitle")}
            </Text>
            <Text color="disabled" display="block" justify="center">
              {t("productAnalytics.slides.title.tagline")}
            </Text>
          </VStack>
        </VStack>

        <div className={styles.hint}>
          <Text type="supporting" display="block" justify="center">
            {t("productAnalytics.slides.title.hint")}
          </Text>
        </div>
      </VStack>
    </div>
  );
}
