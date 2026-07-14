import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Link } from "@astryxdesign/core/Link";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useMarketingTranslation } from "@/features/marketing/lib/use-marketing-translation";
import styles from "./about-tab.module.css";

/*
 * framer-motion drives the Astryx components directly rather than wrapper <div>s — the pattern
 * the Window reference sets out: every Astryx component keeps `ref`/`style`/`className`, so
 * `motion.create()` can drive one.
 */
const MotionVStack = motion.create(VStack);
const MotionHStack = motion.create(HStack);
const MotionCard = motion.create(Card);

/**
 * The mascot's cap, on the one prop that can carry it (`SizeValue`: "numbers are treated as
 * pixels"). It used to be a CSS `max-width` that a 768px media query bumped from 200px to 240px;
 * the letter/mascot split is now a Grid, so there is no breakpoint left to bump it in.
 */
const MASCOT_MAX_WIDTH = 240;

/** The narrowest the letter may get before the mascot drops beneath it. Grid reads the container,
 *  so this replaces the 768px media condition outright. */
const LETTER_COLUMN_MIN_WIDTH = 280;

interface TimelineEntry {
  year: string;
  title: string;
  description: string;
}

function FounderHeader() {
  const { t } = useMarketingTranslation();

  return (
    <HStack gap={4} align="start" justify="between" wrap="wrap">
      <VStack gap={1} align="start">
        <Text type="supporting" size="2xs" className={styles.eyebrow}>
          {t("about.aboutTab.fromTheDesk")}
        </Text>
        <HStack gap={3} align="center">
          {/* Astryx's Avatar derives "JH" from the name, which is what about.aboutTab.initials
              spells out in every locale. There is no prop for literal initials. */}
          <Avatar name={t("about.aboutTab.name")} size="medium" />
          <VStack gap={0} align="start">
            <Text type="large" weight="semibold" display="block">
              {t("about.aboutTab.name")}
            </Text>
            <Text type="supporting" display="block">
              {t("about.aboutTab.role")}
            </Text>
          </VStack>
        </HStack>
      </VStack>
      <Link href="https://x.com/james406" isExternalLink isStandalone>
        {t("about.aboutTab.social")}
      </Link>
    </HStack>
  );
}

function FounderLetter() {
  const { t } = useMarketingTranslation();

  return (
    /* The letter sits beside the mascot when there is room for both, and above it when there is
       not. Grid reads the container, so there is no breakpoint and no CSS. */
    <Grid columns={{ minWidth: LETTER_COLUMN_MIN_WIDTH, max: 2 }} gap={8}>
      <VStack gap={4} align="start">
        <Heading level={1} textWrap="balance">
          {t("about.aboutTab.title")}
        </Heading>
        <Text weight="medium" display="block">
          {t("about.aboutTab.subtitle")}
        </Text>
        <Text color="secondary" display="block">
          {t("about.aboutTab.body1")}
        </Text>
        <Text weight="medium" display="block">
          {t("about.aboutTab.body2")}
        </Text>
        {/* Button renders a real <a> when href is set, so the CTA keeps its link semantics. */}
        <Button
          variant="primary"
          size="sm"
          href="/products"
          label={t("about.aboutTab.cta")}
          endContent={<Icon icon={ArrowRight} />}
        />
      </VStack>

      <VStack align="center" gap={2}>
        <MotionVStack
          width="100%"
          maxWidth={MASCOT_MAX_WIDTH}
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <img
            src="/hedgehog-hero.webp"
            alt={t("about.aboutTab.mascotAlt")}
            width={1024}
            height={1024}
            loading="lazy"
            decoding="async"
            className={styles.mascot}
          />
        </MotionVStack>
        <Text type="supporting" justify="center" display="block" className={styles.caption}>
          {t("about.aboutTab.caption")}
        </Text>
      </VStack>
    </Grid>
  );
}

function CompanyStory() {
  const { t, array } = useMarketingTranslation();
  const timeline = array<TimelineEntry>("about.timeline");

  return (
    <VStack gap={6} align="stretch">
      <Heading level={2}>{t("about.aboutTab.storyTitle")}</Heading>

      <VStack gap={6} align="stretch" className={styles.timeline}>
        {/*
         * The rail is an Astryx `Divider` — the component whose whole job is to draw a line, and
         * which draws it from the theme's own border token. That is what removed the last raw px
         * from this file: the rail used to be a hand-rolled 2px box, offset by `calc(… - 1px)`.
         * Only its placement behind the dots is left in CSS; a divider has no position prop.
         */}
        <Divider orientation="vertical" aria-hidden="true" className={styles.timelineLine} />
        {timeline.map((item, i) => (
          <MotionHStack
            key={item.title}
            gap={4}
            className={styles.timelineRow}
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.08 }}
          >
            <HStack
              aria-hidden="true"
              align="center"
              justify="center"
              className={styles.timelineDot}
            />
            <VStack gap={1} align="start" className={styles.timelineBody}>
              <Badge label={item.year} />
              <Heading level={3}>{item.title}</Heading>
              <Text type="supporting" display="block">
                {item.description}
              </Text>
            </VStack>
          </MotionHStack>
        ))}
      </VStack>

      <MotionCard
        variant="muted"
        padding={6}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <VStack gap={1} align="center">
          <Text type="display-3" color="accent" weight="bold" display="block">
            {`${t("about.aboutTab.teamCount")}+`}
          </Text>
          <Text type="supporting" display="block">
            {t("about.aboutTab.teamCountLabel")}
          </Text>
        </VStack>
      </MotionCard>
    </VStack>
  );
}

export function AboutTab() {
  return (
    <MotionVStack
      height="100%"
      isScrollable
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Section variant="transparent" padding={6}>
        <VStack gap={8} align="stretch">
          <FounderHeader />
          <FounderLetter />
          <Divider />
          <CompanyStory />
        </VStack>
      </Section>
    </MotionVStack>
  );
}
