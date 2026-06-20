import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { pricingCards } from "@/features/marketing/data/homeData";
import { getMarketingIcon } from "@/features/marketing/lib/icon-map";

interface PricingCardsSectionProps {
  onOpenApp: (route: string, title?: string) => void;
}

export function PricingCardsSection({ onOpenApp }: PricingCardsSectionProps) {
  const { t } = useTranslation("marketing");
  const tk = (key: string) => t(key as never);

  return (
    <section className="pt-6 border-t border-[#E5E5E5]">
      <h2 className="text-2xl font-bold text-[#1A1A1A] mb-3">{t("home.pricing.title")}</h2>
      <p className="text-base text-[#1A1A1A] font-medium mb-2">{t("home.pricing.philosophy")}</p>
      <p className="text-sm text-[#6B6B6B] mb-2">{t("home.pricing.freeTierText")}</p>
      <p className="text-sm text-[#6B6B6B] mb-6">{t("home.pricing.salesText")}</p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        {pricingCards.map((card, index) => (
          <motion.div
            key={card.productKey}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.075 }}
            className="border border-[#D1D1D1] rounded-lg p-4 bg-white"
          >
            <div className="flex items-center gap-2 mb-2">
              {getMarketingIcon(card.icon, <BarChart3 className="w-5 h-5 text-[#F76E18]" />)}
              <span className="text-sm font-semibold">{tk(card.productKey)}</span>
            </div>
            <p className="text-xs text-[#22C55E] mb-1">{tk(card.freeTierKey)}</p>
            <p className="text-sm text-[#1A1A1A]">{tk(card.paidRateKey)}</p>
          </motion.div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onOpenApp("/pricing", t("home.pricing.seeAll"))}
        className="text-sm text-[#2563EB] hover:underline mt-2 inline-block"
      >
        {t("home.pricing.seeAll")}
      </button>
    </section>
  );
}
