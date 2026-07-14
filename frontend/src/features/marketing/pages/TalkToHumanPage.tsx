import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import { Headset } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ContactCards, ContactForm, FaqSection } from "@/features/marketing/components/contact";
import styles from "./talk-to-human-page.module.css";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    },
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
      <motion.div
        className={styles.hero}
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
      >
        <motion.div variants={fadeUp} custom={0}>
          <Heading level={1} type="display-3" justify="center" textWrap="balance">
            {t("talkToHuman.hero.title")}
          </Heading>
        </motion.div>

        <motion.div className={styles.heroSubtitle} variants={fadeUp} custom={1}>
          <Text type="large" color="secondary" display="block" justify="center">
            {t("talkToHuman.hero.subtitle")}
          </Text>
        </motion.div>

        <motion.div variants={fadeUp} custom={2}>
          <div className={styles.headsetPlate}>
            <Headset size={32} aria-hidden="true" />
          </div>
        </motion.div>
      </motion.div>

      <ContactCards />

      {/* ── Contact Form ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.4,
          duration: 0.35,
          ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
        }}
      >
        <Section variant="transparent" dividers={["top"]} padding={8} paddingBlock={6}>
          <VStack gap={5} align="stretch">
            <VStack gap={1} align="start">
              <Heading level={2}>{t("talkToHuman.form.title")}</Heading>
              <Text color="secondary" display="block">
                {t("talkToHuman.form.subtitle")}
              </Text>
            </VStack>
            <ContactForm />
          </VStack>
        </Section>
      </motion.div>

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
