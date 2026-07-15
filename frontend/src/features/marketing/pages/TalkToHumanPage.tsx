import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Link } from "@astryxdesign/core/Link";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import { Headset } from "lucide-react";
import { useTranslation } from "react-i18next";
import { tween } from "@/core/motion/astryx-motion";
import { ContactCards, ContactForm, FaqSection } from "@/features/marketing/components/contact";
import styles from "./talk-to-human-page.module.css";

/** framer-motion drives the Astryx components directly — no raw motion.div. See Window.tsx. */
const MotionVStack = motion.create(VStack);
const MotionSection = motion.create(Section);

/**
 * The headset plate's diameter and the hero subtitle's cap. Both sit above Astryx's 48px spacing
 * scale, which has no dimension token; its size props take plain pixel numbers (`SizeValue`:
 * "numbers are treated as pixels"), so they ride props rather than the stylesheet.
 */
const HEADSET_PLATE_SIZE = 64;
const HERO_SUBTITLE_MAX_WIDTH = 384;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: tween("medium-min", { delay: i * 0.1 }),
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function TalkToHumanPage() {
  const { t } = useTranslation("marketing");

  return (
    <VStack height="100%" isScrollable>
      {/* ── Hero ── */}
      {/* The hero's padding was 28 / 32 / 20 in CSS — off Astryx's SpacingStep scale, so it could
          not ride a prop. Landed on the scale (paddingInline={8}, paddingBlock={6}) it can, and
          the class went with it. */}
      <MotionVStack
        gap={3}
        align="center"
        paddingInline={8}
        paddingBlock={6}
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <MotionVStack variants={fadeUp} custom={0}>
          <Heading level={1} type="display-3" justify="center" textWrap="balance">
            {t("talkToHuman.hero.title")}
          </Heading>
        </MotionVStack>

        <MotionVStack maxWidth={HERO_SUBTITLE_MAX_WIDTH} variants={fadeUp} custom={1}>
          <Text type="large" color="secondary" display="block" justify="center">
            {t("talkToHuman.hero.subtitle")}
          </Text>
        </MotionVStack>

        <MotionVStack variants={fadeUp} custom={2}>
          {/* The glyph's hue is an Icon prop (`IconColor` carries the categorical hues). Only the
              plate's pill radius and its tinted background are left in CSS — Astryx's stacks have
              no radius or background prop — and both are tokens. */}
          <HStack
            width={HEADSET_PLATE_SIZE}
            height={HEADSET_PLATE_SIZE}
            align="center"
            justify="center"
            className={styles.headsetPlate}
          >
            <Icon icon={Headset} size="lg" color="orange" aria-hidden="true" />
          </HStack>
        </MotionVStack>
      </MotionVStack>

      <ContactCards />

      {/* ── Contact Form ── */}
      <MotionSection
        variant="transparent"
        dividers={["top"]}
        padding={8}
        paddingBlock={6}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={tween("medium-min", { delay: 0.4 })}
      >
        <VStack gap={5} align="stretch">
          <VStack gap={1} align="start">
            <Heading level={2}>{t("talkToHuman.form.title")}</Heading>
            <Text color="secondary" display="block">
              {t("talkToHuman.form.subtitle")}
            </Text>
          </VStack>
          <ContactForm />
        </VStack>
      </MotionSection>

      <FaqSection />

      {/* ── Footer note ── */}
      <Section variant="transparent" dividers={["top"]} padding={8} paddingBlock={5}>
        <VStack gap={0.5} align="center">
          <Text color="secondary" display="block" justify="center">
            {t("talkToHuman.footer.selfServe")}
          </Text>
          <Text color="secondary" display="block" justify="center">
            {t("talkToHuman.footer.linksBefore")}
            <Link href="/docs" type="inherit">
              {t("talkToHuman.footer.docs")}
            </Link>
            {t("talkToHuman.footer.linksMiddle")}
            <Link href="/community" type="inherit">
              {t("talkToHuman.footer.community")}
            </Link>
            {t("talkToHuman.footer.linksAfter")}
          </Text>
        </VStack>
      </Section>
    </VStack>
  );
}
