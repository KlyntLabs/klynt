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
    <section className="px-6 sm:px-8 py-6 border-b border-[#E5E5E5]">
      <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">{t("pricing.usagePricing.title")}</h2>
      <p className="text-sm text-[#6B6B6B] mb-6">{t("pricing.usagePricing.subtitle")}</p>
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
    </section>
  );
}
