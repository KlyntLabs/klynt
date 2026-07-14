import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { Code2, Globe, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import styles from "./product-analytics-slides.module.css";

const PILLAR_ICONS = [Globe, Shield, Code2];

export function SlidePrivacy() {
  const { t } = useTranslation("marketing");
  const pillars = t("productAnalytics.slides.privacy.items", { returnObjects: true }) as {
    title: string;
    desc: string;
  }[];

  return (
    <div className={styles.privacySlide}>
      <VStack gap={8} align="center" width="100%">
        <Heading level={2} justify="center">
          {t("productAnalytics.slides.privacy.title")}
        </Heading>

        <Grid columns={3} gap={6} width="100%" maxWidth={576}>
          {pillars.map(({ title, desc }, index) => {
            const Icon = PILLAR_ICONS[index] ?? Globe;
            return (
              <Card key={title} padding={5}>
                <VStack gap={3} align="center">
                  <div className={styles.pillarPlate}>
                    <Icon className={styles.pillarIcon} aria-hidden="true" />
                  </div>
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
