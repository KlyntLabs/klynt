import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export function PricingHeroSection() {
  const { t } = useTranslation("marketing");

  return (
    <section className="px-6 sm:px-8 pt-6 sm:pt-7 pb-6 border-b border-[#E5E5E5]">
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-4">
        {/* Left: text */}
        <motion.div
          className="flex-[3] min-w-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.4,
            ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
          }}
        >
          <h1
            className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-4"
            style={{ letterSpacing: "-0.02em" }}
          >
            {t("pricing.hero.title")}
          </h1>
          <p className="text-base text-[#6B6B6B] mb-4 leading-relaxed">
            {t("pricing.hero.body1", { productCount: 10 })}
          </p>
          <p className="text-sm text-[#6B6B6B] leading-relaxed">{t("pricing.hero.body2")}</p>
        </motion.div>

        {/* Right: illustration placeholder */}
        <motion.div
          className="flex-[2] flex flex-col items-center justify-center shrink-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <div className="w-full max-w-[220px] aspect-square rounded-xl bg-[#F5F3EF] border border-[#E5E5E5] flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl font-bold text-[#F76E18] mb-2">
                {t("pricing.hero.statNumber")}
              </div>
              <div className="text-sm text-[#6B6B6B] font-medium">
                {t("pricing.hero.statLabel")}
              </div>
            </div>
          </div>
          <p className="text-xs text-[#9CA3AF] italic text-center mt-2 max-w-[220px]">
            {t("pricing.hero.caption")}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
