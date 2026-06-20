import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  ChevronDown,
  Code2,
  Database,
  ExternalLink,
  FileText,
  Webhook,
} from "lucide-react";
import { useState } from "react";
import { useMarketingTranslation } from "@/features/marketing/lib/use-marketing-translation";
import { staggerContainer, staggerItem } from "./constants";

interface DataIOCardProps {
  icon: React.ReactNode;
  title: string;
  items: string[];
  linkText?: string;
}

function DataIOCard({ icon, title, items, linkText }: DataIOCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-[#D1D1D1] rounded-lg bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-[#FAFAF8] transition-colors"
      >
        <div className="w-8 h-8 rounded-md bg-[#F5F3EF] flex items-center justify-center text-[#6B6B6B]">
          {icon}
        </div>
        <span className="flex-1 text-sm font-semibold text-[#1A1A1A]">{title}</span>
        <ChevronDown
          className={`w-4 h-4 text-[#6B6B6B] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{
              duration: 0.25,
              ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
            }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div className="flex flex-wrap gap-1.5">
                {items.map((item) => (
                  <span
                    key={item}
                    className="px-2 py-1 bg-[#F5F3EF] hover:bg-[#EBE8E2] rounded text-xs text-[#1A1A1A] cursor-pointer transition-colors"
                  >
                    {item}
                  </span>
                ))}
              </div>
              {linkText && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 mt-3 text-xs text-[#2563EB] hover:underline"
                >
                  {linkText} <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ManageCardProps {
  icon: React.ReactNode;
  title: string;
}

function ManageCard({ icon, title }: ManageCardProps) {
  return (
    <div className="border border-[#D1D1D1] rounded-lg p-4 bg-white hover:shadow-sm hover:border-[#C1C1C1] transition-all cursor-pointer flex items-center gap-3">
      <div className="w-8 h-8 rounded-md bg-[#F5F3EF] flex items-center justify-center text-[#6B6B6B]">
        {icon}
      </div>
      <span className="text-sm font-medium text-[#1A1A1A]">{title}</span>
    </div>
  );
}

export function DataPlatformSection() {
  const { t, array } = useMarketingTranslation();

  const dataSources = array<string>("data.dataSources");
  const dataExport = array<string>("data.dataExport");
  const manageCards = array<{ title: string }>("products.dataPlatform.manageCards");

  return (
    <section className="px-6 sm:px-8 py-6 border-b border-[#E5E5E5]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-bold text-[#1A1A1A]">{t("products.dataPlatform.title")}</h2>
        <button
          type="button"
          className="text-sm text-[#2563EB] hover:underline flex items-center gap-1"
        >
          {t("products.dataPlatform.readme")} <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-sm text-[#6B6B6B] mb-5">{t("products.dataPlatform.body")}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <DataIOCard
          icon={<Database className="w-4 h-4" />}
          title={t("products.dataPlatform.sourcesCard.title")}
          items={dataSources}
          linkText={t("products.dataPlatform.sourcesCard.link")}
        />
        <DataIOCard
          icon={<Webhook className="w-4 h-4" />}
          title={t("products.dataPlatform.exportCard.title")}
          items={dataExport}
          linkText={t("products.dataPlatform.exportCard.link")}
        />
      </div>

      <div className="mb-2">
        <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3">
          {t("products.dataPlatform.manageTitle")}
        </h3>
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {[
            { icon: <Code2 className="w-4 h-4" />, title: manageCards[0]?.title },
            { icon: <Database className="w-4 h-4" />, title: manageCards[1]?.title },
            { icon: <Webhook className="w-4 h-4" />, title: manageCards[2]?.title },
            { icon: <FileText className="w-4 h-4" />, title: manageCards[3]?.title },
            { icon: <BarChart3 className="w-4 h-4" />, title: manageCards[4]?.title },
          ].map((card, i) => (
            <motion.div key={card.title ?? i} variants={staggerItem} custom={i}>
              <ManageCard icon={card.icon} title={card.title ?? ""} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
