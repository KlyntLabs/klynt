import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { Code2, Globe, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import styles from "./product-analytics-slides.module.css";

const PILLAR_ICONS = [Globe, Shield, Code2];

/** The pillar grid's cap. Past the spacing scale, so it rides Grid's own maxWidth prop. */
const GRID_MAX_WIDTH = 576;

export function SlidePrivacy() {
  const { t } = useTranslation("marketing");
  const pillars = t("productAnalytics.slides.privacy.items", { returnObjects: true }) as {
    title: string;
    desc: string;
  }[];

  return (
    <VStack height="100%" width="100%" paddingInline={8} gap={8} align="center" justify="center">
      <Heading level={2} justify="center">
        {t("productAnalytics.slides.privacy.title")}
      </Heading>

      <Grid columns={3} gap={6} width="100%" maxWidth={GRID_MAX_WIDTH}>
        {pillars.map(({ title, desc }, index) => {
          const glyph = PILLAR_ICONS[index] ?? Globe;
          return (
            <Card key={title} padding={5}>
              <VStack gap={3} align="center">
                {/* The plate is a token'd 48px circle; the mark inside it is `lg` — 24px, exactly
                    what the old `.pillarIcon` rule set — and `accent` is the same token it used. */}
                <HStack align="center" justify="center" className={styles.pillarPlate}>
                  <Icon icon={glyph} size="lg" color="accent" />
                </HStack>
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
  );
}
