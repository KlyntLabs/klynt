import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Icon } from "@astryxdesign/core/Icon";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { BarChart3, FileCode, RefreshCw, Route, Target, TrendingUp, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

const FEATURE_ICONS = [TrendingUp, Target, RefreshCw, Route, Users, FileCode];

/** The feature grid's cap. Past the spacing scale, so it rides Grid's own maxWidth prop. */
const GRID_MAX_WIDTH = 576;

export function SlideFeatures() {
  const { t } = useTranslation("marketing");
  const features = t("productAnalytics.slides.features.items", { returnObjects: true }) as {
    title: string;
    desc: string;
  }[];

  return (
    <VStack height="100%" width="100%" paddingInline={8} gap={8} align="center" justify="center">
      <Heading level={2} justify="center">
        {t("productAnalytics.slides.features.title")}
      </Heading>

      <Grid columns={3} gap={4} width="100%" maxWidth={GRID_MAX_WIDTH}>
        {features.map(({ title, desc }, index) => {
          const glyph = FEATURE_ICONS[index] ?? BarChart3;
          return (
            <Card key={title} padding={5}>
              <VStack gap={2} align="center">
                {/* `lg` + `color="accent"` replace a CSS rule that sized the svg to 28px and
                    painted it with --color-icon-accent — both are Icon props. */}
                <Icon icon={glyph} size="lg" color="accent" />
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
