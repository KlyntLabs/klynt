import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { BarChart3, FileCode, RefreshCw, Route, Target, TrendingUp, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import styles from "./product-analytics-slides.module.css";

const FEATURE_ICONS = [TrendingUp, Target, RefreshCw, Route, Users, FileCode];

export function SlideFeatures() {
  const { t } = useTranslation("marketing");
  const features = t("productAnalytics.slides.features.items", { returnObjects: true }) as {
    title: string;
    desc: string;
  }[];

  return (
    <div className={styles.featuresSlide}>
      <VStack gap={8} align="center" width="100%">
        <Heading level={2} justify="center">
          {t("productAnalytics.slides.features.title")}
        </Heading>

        <Grid columns={3} gap={4} width="100%" maxWidth={576}>
          {features.map(({ title, desc }, index) => {
            const Icon = FEATURE_ICONS[index] ?? BarChart3;
            return (
              <Card key={title} padding={5}>
                <VStack gap={2} align="center">
                  <Icon className={styles.featureIcon} aria-hidden="true" />
                  <VStack gap={1} align="center">
                    <Text type="label" weight="semibold" display="block" justify="center">
                      {title}
                    </Text>
                    <Text type="supporting" size="xsm" display="block" justify="center">
                      {desc}
                    </Text>
                  </VStack>
                </VStack>
              </Card>
            );
          })}
        </Grid>
      </VStack>
    </div>
  );
}
