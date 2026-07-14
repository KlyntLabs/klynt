import { Heading } from "@astryxdesign/core/Heading";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import styles from "./pricing-hero-section.module.css";

export function PricingHeroSection() {
  const { t } = useTranslation("marketing");

  return (
    <Section variant="transparent" padding={6} dividers={["bottom"]}>
      <div className={styles.columns}>
        <motion.div
          className={styles.textColumn}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
          }}
        >
          <VStack gap={4} align="start">
            <Heading level={1} textWrap="balance">
              {t("pricing.hero.title")}
            </Heading>
            <Text type="large" color="secondary" display="block">
              {t("pricing.hero.body1", { productCount: 10 })}
            </Text>
            <Text type="supporting" display="block">
              {t("pricing.hero.body2")}
            </Text>
          </VStack>
        </motion.div>

        <motion.div
          className={styles.statColumn}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <div className={styles.statPlate}>
            <VStack gap={2} align="center" justify="center" height="100%">
              <Text size="4xl" weight="bold" color="accent" display="block">
                {t("pricing.hero.statNumber")}
              </Text>
              <Text type="label" color="secondary" weight="medium" justify="center">
                {t("pricing.hero.statLabel")}
              </Text>
            </VStack>
          </div>
          <Text type="supporting" size="xsm" justify="center" display="block">
            <em>{t("pricing.hero.caption")}</em>
          </Text>
        </motion.div>
      </div>
    </Section>
  );
}
