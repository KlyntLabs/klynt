import { Heading } from "@astryxdesign/core/Heading";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { PricingProductCard } from "@/features/marketing/components/pricing";
import { productPricings } from "@/features/marketing/lib/pricing-data";

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

interface UsagePricingSectionProps {
  tk: (key: string, options?: Record<string, unknown>) => string;
}

export function UsagePricingSection({ tk }: UsagePricingSectionProps) {
  const { t } = useTranslation("marketing");

  return (
    <Section variant="transparent" padding={6} dividers={["bottom"]}>
      <VStack gap={6}>
        <VStack gap={2}>
          <Heading level={2}>{t("pricing.usagePricing.title")}</Heading>
          <Text type="supporting">{t("pricing.usagePricing.subtitle")}</Text>
        </VStack>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {productPricings.map((p) => (
            <PricingProductCard key={p.id} product={p} tk={tk} />
          ))}
        </motion.div>
      </VStack>
    </Section>
  );
}
