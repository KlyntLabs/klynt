import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FreeTierCard } from "@/features/marketing/components/pricing";
import { freeTierIconMap } from "@/features/marketing/lib/pricing-data";
import type { FreeTierItem } from "@/features/marketing/lib/pricing-types";

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
    <section className="px-6 sm:px-8 py-6 border-b border-[#E5E5E5]">
      {/* Toggle */}
      <div className="flex items-center justify-center mb-6">
        <div className="inline-flex rounded-lg overflow-hidden border border-[#D1D1D1]">
          <button
            type="button"
            onClick={() => setPlanTab("free")}
            className={`px-5 py-2 text-sm font-medium transition-colors ${
              planTab === "free"
                ? "bg-[#F0EDE6] text-[#1A1A1A]"
                : "bg-white text-[#6B6B6B] hover:bg-[#FAFAF8]"
            }`}
          >
            {t("pricing.planToggle.free")}
          </button>
          <button
            type="button"
            onClick={() => setPlanTab("scale")}
            className={`px-5 py-2 text-sm font-medium transition-colors border-l border-[#D1D1D1] ${
              planTab === "scale"
                ? "bg-[#F0EDE6] text-[#1A1A1A]"
                : "bg-white text-[#6B6B6B] hover:bg-[#FAFAF8]"
            }`}
          >
            {t("pricing.planToggle.scale")}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {planTab === "free" ? (
          <motion.div
            key="free"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">
                {t("pricing.freeTier.title")}
              </h2>
              <p className="text-sm text-[#6B6B6B]">{t("pricing.freeTier.subtitle")}</p>
            </div>
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {freeTierWithIcons.map((item) => (
                <motion.div key={item.product} variants={staggerItem}>
                  <FreeTierCard item={item as FreeTierItem} />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="scale"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-[#1A1A1A] mb-1">
                {t("pricing.scalePlan.title")}
              </h2>
              <p className="text-sm text-[#6B6B6B]">{t("pricing.scalePlan.subtitle")}</p>
            </div>
            <div className="max-w-lg mx-auto">
              <div className="border border-[#D1D1D1] rounded-lg p-6 bg-white">
                <div className="text-center mb-4">
                  <span className="text-3xl font-bold text-[#1A1A1A]">
                    {t("pricing.scalePlan.price")}
                  </span>
                  <span className="text-sm text-[#6B6B6B]">
                    {t("pricing.scalePlan.priceSuffix")}
                  </span>
                </div>
                <ul className="space-y-2">
                  {scaleFeatures.map((feature, i) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      {i === 0 ? (
                        <span className="text-[#6B6B6B] font-medium">{feature}</span>
                      ) : (
                        <>
                          <span className="text-[#22C55E] mt-0.5">&#10003;</span>
                          <span className="text-[#1A1A1A]">{feature}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="w-full mt-5 px-4 py-2.5 bg-[#F76E18] hover:bg-[#E56310] text-white text-sm font-medium rounded-md transition-colors"
                >
                  {t("pricing.scalePlan.cta")}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
