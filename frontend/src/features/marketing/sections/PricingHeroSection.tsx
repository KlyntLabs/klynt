import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import styles from "./pricing-hero-section.module.css";

/** framer-motion drives the Astryx components directly — no raw motion.div. See Window.tsx. */
const MotionVStack = motion.create(VStack);

/**
 * The stat plate's cap. Above Astryx's 48px spacing scale, so it rides a `SizeValue` prop
 * ("numbers are treated as pixels") rather than the stylesheet.
 */
const STAT_PLATE_MAX_WIDTH = 220;

/*
 * The hero splits into two columns, and collapses to one when the container is narrow.
 *
 * It used to be `flex: 3` / `flex: 2` inside a 640px media query. The obvious way to keep the 3:2
 * ratio without a breakpoint is `Grid columns={5}` + `GridSpan` 3 and 2 — and that is wrong: a
 * fixed track count never reflows, so on a phone the copy gets 3/5 of 375px and the plate 150px.
 * That trades a working mobile layout for a ratio.
 *
 * `columns={{minWidth, max}}` is container-driven instead: two equal tracks when there is room for
 * two, one when there is not. The 3:2 ratio is the thing we gave up — Astryx cannot express a
 * *ratio that also reflows*, and between the two, reflow is the one users feel.
 */
const HERO_MIN_COLUMN = 320;
const HERO_MAX_COLUMNS = 2;

export function PricingHeroSection() {
  const { t } = useTranslation("marketing");

  return (
    <Section variant="transparent" padding={6} dividers={["bottom"]}>
      <Grid columns={{ minWidth: HERO_MIN_COLUMN, max: HERO_MAX_COLUMNS }} gap={6} align="center">
        <MotionVStack
          gap={4}
          align="start"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
          }}
        >
          <Heading level={1} textWrap="balance">
            {t("pricing.hero.title")}
          </Heading>
          <Text type="large" color="secondary" display="block">
            {t("pricing.hero.body1", { productCount: 10 })}
          </Text>
          <Text type="supporting" display="block">
            {t("pricing.hero.body2")}
          </Text>
        </MotionVStack>

        <MotionVStack
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <VStack gap={2} align="center" justify="center" height="100%">
            {/* The plate is a surface — border, radius, muted background — which is Card. Only its
                1:1 aspect ratio, a shape rather than a value, is left in CSS. */}
            <Card
              variant="muted"
              padding={0}
              width="100%"
              maxWidth={STAT_PLATE_MAX_WIDTH}
              className={styles.statPlate}
            >
              <VStack gap={2} align="center" justify="center" height="100%">
                <Text size="4xl" weight="bold" color="accent" display="block">
                  {t("pricing.hero.statNumber")}
                </Text>
                <Text type="label" color="secondary" weight="medium" justify="center">
                  {t("pricing.hero.statLabel")}
                </Text>
              </VStack>
            </Card>
            <VStack maxWidth={STAT_PLATE_MAX_WIDTH}>
              <Text type="supporting" size="xsm" justify="center" display="block">
                <em>{t("pricing.hero.caption")}</em>
              </Text>
            </VStack>
          </VStack>
        </MotionVStack>
      </Grid>
    </Section>
  );
}
