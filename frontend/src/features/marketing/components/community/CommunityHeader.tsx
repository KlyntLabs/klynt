import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useMarketingTranslation } from "@/features/marketing/lib/use-marketing-translation";

function getTodayDate(language: string): string {
  const d = new Date();
  return d.toLocaleDateString(language === "cn" ? "zh-CN" : language === "vi" ? "vi-VN" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function CommunityHeader() {
  const { t, language } = useMarketingTranslation();

  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="px-6 md:px-8 pt-6 pb-4 border-b-[3px] border-double border-[#1A1A1A]"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
        <p className="text-sm text-[#6B6B6B]">{getTodayDate(language)}</p>
        <h1
          className="text-2xl md:text-3xl font-bold text-[#1A1A1A] text-center"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          {t("community.header.title")}
        </h1>
        <div className="flex items-center gap-2 text-xs text-[#22C55E]">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {t("community.header.operational")}
        </div>
      </div>
      <p className="text-xs text-[#6B6B6B] text-center italic">{t("community.header.tagline")}</p>
    </motion.header>
  );
}
