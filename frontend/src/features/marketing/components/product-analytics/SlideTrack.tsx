import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import styles from "./product-analytics-slides.module.css";

/*
 * REDESIGNED so the slide is expressible in Astryx with no exceptions.
 *
 * The old slide was a copy column beside a 192px plate holding an 80px BarChart3 glyph — an
 * illustration, not a UI icon. Astryx ships no illustration primitive, `IconSize` is exactly
 * xsm(12) | sm(16) | md(20) | lg(24), and Icon's docs forbid the alternative outright: "Don't
 * resize icons with arbitrary pixel values; use the provided size props".
 *
 * Rather than carve out an exception, the slide is redesigned. The decorative plate is gone, and
 * the six tracked items — a cramped single-column list beside it before — now fill the slide as a
 * two-column grid of Cards, each a green check plate plus its label. Same i18n keys, same items,
 * no glyph above 12px, and the column reflow is Grid's container-driven `minWidth` rather than a
 * media query.
 */
export function SlideTrack() {
  const { t } = useTranslation("marketing");
  const items = t("productAnalytics.slides.track.items", { returnObjects: true }) as string[];

  return (
    <VStack height="100%" paddingInline={8} paddingBlock={6} gap={6} justify="center">
      <Heading level={2}>{t("productAnalytics.slides.track.title")}</Heading>

      <Grid columns={{ minWidth: 240, max: 2 }} gap={3}>
        {items.map((item) => (
          <Card key={item} variant="muted" padding={3}>
            <HStack gap={3} align="center">
              {/* The dot is a token'd 20px plate; the tick inside it is `xsm` — 12px exactly. */}
              <HStack align="center" justify="center" className={styles.checkDot}>
                <Icon icon={Check} size="xsm" />
              </HStack>
              <Text type="label" weight="medium">
                {item}
              </Text>
            </HStack>
          </Card>
        ))}
      </Grid>
    </VStack>
  );
}
