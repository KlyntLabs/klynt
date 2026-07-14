import { Divider } from "@astryxdesign/core/Divider";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useMarketingTranslation } from "@/features/marketing/lib/use-marketing-translation";
import styles from "./community-header.module.css";

/* The masthead is a VStack that framer-motion drives directly — `as="header"` keeps the landmark. */
const MotionVStack = motion.create(VStack);

/**
 * The narrowest a masthead cell may get before date / masthead / status stack. Astryx's Grid
 * reflows on the container, so the 640px breakpoint that used to flip this row is gone.
 */
const MASTHEAD_CELL_MIN_WIDTH = 200;
const MASTHEAD_CELLS = 3;

function getTodayDate(language: string): string {
  const d = new Date();
  return d.toLocaleDateString(language === "cn" ? "zh-CN" : language === "vi" ? "vi-VN" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function CommunityHeader() {
  const { t, language } = useMarketingTranslation();

  return (
    <MotionVStack
      as="header"
      gap={0}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <VStack gap={2} padding={6}>
        {/* Date, masthead and status sit side by side when there is room and stack when there is
            not — a `Grid`, which reads the container, in place of the old 640px media query. */}
        <Grid
          columns={{ minWidth: MASTHEAD_CELL_MIN_WIDTH, max: MASTHEAD_CELLS }}
          gap={2}
          align="center"
        >
          <Text color="secondary">{getTodayDate(language)}</Text>

          {/* The serif is a token override, so it can sit on the Heading itself — Heading reads
              `--font-family-heading`, and a custom property set on an element resolves there. */}
          <Heading level={1} justify="center" className={styles.masthead}>
            {t("community.header.title")}
          </Heading>

          <HStack gap={1} align="center" justify="end" className={styles.operational}>
            <Icon icon={CheckCircle2} color="success" size="xsm" />
            <Text type="supporting" color="inherit">
              {t("community.header.operational")}
            </Text>
          </HStack>
        </Grid>

        <Text type="supporting" display="block" justify="center">
          <em>{t("community.header.tagline")}</em>
        </Text>
      </VStack>

      {/*
       * The masthead rule. It was a `3px double` border — a newspaper flourish Astryx has no token
       * for, and the last raw px in this file. It is an Astryx `Divider variant="strong"` now: the
       * component whose job is to draw a rule, drawing it from the emphasised border token. A
       * single strong line rather than a double one, which is the trade the redesign accepts.
       */}
      <Divider variant="strong" />
    </MotionVStack>
  );
}
