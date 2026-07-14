import { Heading } from "@astryxdesign/core/Heading";
import { List, ListItem } from "@astryxdesign/core/List";
import { VStack } from "@astryxdesign/core/VStack";
import { BarChart3, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import styles from "./product-analytics-slides.module.css";

export function SlideTrack() {
  const { t } = useTranslation("marketing");
  const items = t("productAnalytics.slides.track.items", { returnObjects: true }) as string[];

  return (
    <div className={styles.trackSlide}>
      <div className={styles.column}>
        <VStack gap={6} align="start">
          <Heading level={2}>{t("productAnalytics.slides.track.title")}</Heading>
          <List density="compact">
            {items.map((item) => (
              <ListItem
                key={item}
                label={item}
                startContent={
                  <span className={styles.checkDot}>
                    <Check className={styles.checkDotIcon} aria-hidden="true" />
                  </span>
                }
              />
            ))}
          </List>
        </VStack>
      </div>

      <div className={styles.visualColumn}>
        <div className={styles.chartPlate}>
          <BarChart3 className={styles.chartPlateIcon} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
