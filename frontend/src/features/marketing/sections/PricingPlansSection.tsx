import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Section } from "@astryxdesign/core/Section";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FreeTierCard } from "@/features/marketing/components/pricing";
import { freeTierIconMap } from "@/features/marketing/lib/pricing-data";
import type { FreeTierItem } from "@/features/marketing/lib/pricing-types";
import styles from "./pricing-plans-section.module.css";

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

const panelMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
};

export function PricingPlansSection() {
  const { t } = useTranslation("marketing");
  const [planTab, setPlanTab] = useState<"free" | "scale">("free");

  const freeTierItems = t("pricing.freeTier.items", { returnObjects: true }) as unknown as Omit<
    FreeTierItem,
    "icon"
  >[];
  const freeTierWithIcons = useMemo(
    () =>
      freeTierItems.map((item, i) => ({
        ...item,
        icon: freeTierIconMap[i] ?? null,
      })),
    [freeTierItems]
  );

  const scaleFeatures = t("pricing.scalePlan.features", {
    returnObjects: true,
  }) as unknown as string[];

  return (
    <Section variant="transparent" padding={6} dividers={["bottom"]}>
      <VStack gap={6}>
        {/*
         * Astryx models this as SegmentedControl, not TabList: it is an input that always has
         * exactly one selection and switches a mode within the section, rather than navigation
         * between page-level views. Segments expose role="radio" with the label as the
         * accessible name.
         */}
        <HStack justify="center">
          <SegmentedControl
            value={planTab}
            onChange={(value) => setPlanTab(value as "free" | "scale")}
            label={`${t("pricing.planToggle.free")} / ${t("pricing.planToggle.scale")}`}
          >
            <SegmentedControlItem value="free" label={t("pricing.planToggle.free")} />
            <SegmentedControlItem value="scale" label={t("pricing.planToggle.scale")} />
          </SegmentedControl>
        </HStack>

        <AnimatePresence mode="wait">
          {planTab === "free" ? (
            <motion.div key="free" {...panelMotion}>
              <VStack gap={6}>
                <VStack gap={1} align="center">
                  <Heading level={2} justify="center">
                    {t("pricing.freeTier.title")}
                  </Heading>
                  <Text type="supporting" justify="center">
                    {t("pricing.freeTier.subtitle")}
                  </Text>
                </VStack>

                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  <Grid columns={{ minWidth: 240, max: 3 }} gap={3}>
                    {freeTierWithIcons.map((item) => (
                      <motion.div key={item.product} variants={staggerItem}>
                        <FreeTierCard item={item as FreeTierItem} />
                      </motion.div>
                    ))}
                  </Grid>
                </motion.div>
              </VStack>
            </motion.div>
          ) : (
            <motion.div key="scale" {...panelMotion}>
              <VStack gap={6}>
                <VStack gap={1} align="center">
                  <Heading level={2} justify="center">
                    {t("pricing.scalePlan.title")}
                  </Heading>
                  <Text type="supporting" justify="center">
                    {t("pricing.scalePlan.subtitle")}
                  </Text>
                </VStack>

                <div className={styles.scalePanel}>
                  <Card padding={6}>
                    <VStack gap={4}>
                      <HStack gap={1} align="end" justify="center">
                        <Text size="3xl" weight="bold">
                          {t("pricing.scalePlan.price")}
                        </Text>
                        <Text type="supporting">{t("pricing.scalePlan.priceSuffix")}</Text>
                      </HStack>

                      <VStack as="ul" gap={2} align="start">
                        {scaleFeatures.map((feature, i) => (
                          <HStack as="li" key={feature} gap={2} align="start">
                            {i === 0 ? (
                              <Text type="label" color="secondary" weight="medium">
                                {feature}
                              </Text>
                            ) : (
                              <>
                                <Check size={16} className={styles.check} aria-hidden="true" />
                                <Text type="label">{feature}</Text>
                              </>
                            )}
                          </HStack>
                        ))}
                      </VStack>

                      <div className={styles.blockAction}>
                        <Button variant="primary" label={t("pricing.scalePlan.cta")} />
                      </div>
                    </VStack>
                  </Card>
                </div>
              </VStack>
            </motion.div>
          )}
        </AnimatePresence>
      </VStack>
    </Section>
  );
}
