import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { Heading } from "@astryxdesign/core/Heading";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { pricingCards } from "@/features/marketing/data/homeData";
import { getMarketingIcon } from "@/features/marketing/lib/icon-map";
import styles from "./pricing-cards-section.module.css";

/** framer-motion animates the Card itself — no wrapper div. See Window.tsx for the pattern. */
const MotionCard = motion.create(Card);

interface PricingCardsSectionProps {
  onOpenApp: (route: string, title?: string) => void;
}

export function PricingCardsSection({ onOpenApp }: PricingCardsSectionProps) {
  const { t } = useTranslation("marketing");
  const tk = (key: string) => t(key as never);

  return (
    <Section variant="transparent" padding={0} paddingBlock={6} dividers={["top"]}>
      <VStack gap={6} align="start">
        <VStack gap={2} align="start">
          <Heading level={2}>{t("home.pricing.title")}</Heading>
          <Text weight="medium" display="block">
            {t("home.pricing.philosophy")}
          </Text>
          <Text type="supporting" display="block">
            {t("home.pricing.freeTierText")}
          </Text>
          <Text type="supporting" display="block">
            {t("home.pricing.salesText")}
          </Text>
        </VStack>

        <Grid columns={{ minWidth: 160, max: 5 }} gap={3} width="100%">
          {pricingCards.map((card, index) => (
            <MotionCard
              key={card.productKey}
              padding={4}
              height="100%"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.075 }}
            >
              <VStack gap={1} align="start">
                <HStack gap={2} align="center">
                  {getMarketingIcon(card.icon, <Icon icon={BarChart3} size="md" />)}
                  <Text type="label" weight="semibold">
                    {tk(card.productKey)}
                  </Text>
                </HStack>
                <Text type="supporting" size="xsm" display="block" className={styles.freeTier}>
                  {tk(card.freeTierKey)}
                </Text>
                <Text type="label" display="block">
                  {tk(card.paidRateKey)}
                </Text>
              </VStack>
            </MotionCard>
          ))}
        </Grid>

        <Button
          variant="ghost"
          size="sm"
          label={t("home.pricing.seeAll")}
          onClick={() => onOpenApp("/pricing", t("home.pricing.seeAll"))}
        />
      </VStack>
    </Section>
  );
}
