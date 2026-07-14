import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
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
    <div className={styles.columns}>
      <VStack gap={4} align="start" className={styles.letter}>
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

      <div className={styles.mascotColumn}>
        <motion.div
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
        </motion.div>
        <Text type="supporting" justify="center" display="block" className={styles.caption}>
          {t("about.aboutTab.caption")}
        </Text>
      </div>
    </div>
  );
}

function CompanyStory() {
  const { t, array } = useMarketingTranslation();
  const timeline = array<TimelineEntry>("about.timeline");

  return (
    <VStack gap={6} align="stretch">
      <Heading level={2}>{t("about.aboutTab.storyTitle")}</Heading>

      <div className={styles.timeline}>
        <div className={styles.timelineLine} aria-hidden="true" />
        <VStack gap={6} align="stretch">
          {timeline.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.08 }}
              className={styles.timelineRow}
            >
              <div className={styles.timelineDot} aria-hidden="true" />
              <VStack gap={1} align="start" className={styles.timelineBody}>
                <Badge label={item.year} />
                <Heading level={3}>{item.title}</Heading>
                <Text type="supporting" display="block">
                  {item.description}
                </Text>
              </VStack>
            </motion.div>
          ))}
        </VStack>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <Card variant="muted" padding={6}>
          <VStack gap={1} align="center">
            <Text type="display-3" color="accent" weight="bold" display="block">
              {`${t("about.aboutTab.teamCount")}+`}
            </Text>
            <Text type="supporting" display="block">
              {t("about.aboutTab.teamCountLabel")}
            </Text>
          </VStack>
        </Card>
      </motion.div>
    </VStack>
  );
}

export function AboutTab() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <VStack height="100%" isScrollable>
        <Section variant="transparent" padding={6}>
          <VStack gap={8} align="stretch">
            <FounderHeader />
            <FounderLetter />
            <Divider />
            <CompanyStory />
          </VStack>
        </Section>
      </VStack>
    </motion.div>
  );
}
