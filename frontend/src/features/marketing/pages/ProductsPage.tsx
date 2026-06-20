import { motion } from "framer-motion";
import { ExternalLink, Link as LinkIcon, Play, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DataPlatformSection,
  InstallCard,
  ProductCatalog,
} from "@/features/marketing/components/product-catalog";

export default function ProductsPage() {
  const { t } = useTranslation("marketing");

  return (
    <div className="w-full">
      {/* ── Hero ── */}
      <section className="px-6 sm:px-8 pt-6 sm:pt-7 pb-6 border-b border-[#E5E5E5]">
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-4">
          <motion.div
            className="flex-1 min-w-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
            }}
          >
            <h1
              className="text-2xl sm:text-3xl font-bold text-[#1A1A1A] leading-tight mb-4"
              style={{ letterSpacing: "-0.02em" }}
            >
              {t("products.hero.title")}
            </h1>
            <p className="text-base text-[#6B6B6B] leading-relaxed mb-5">
              {t("products.hero.body")}
            </p>

            <InstallCard />

            <div className="flex flex-wrap items-center gap-3 mt-5 text-sm">
              <a
                href="/docs/model-context-protocol"
                className="flex items-center gap-1 text-[#2563EB] hover:underline"
              >
                <LinkIcon className="w-4 h-4" /> {t("products.hero.links.mcp")}
              </a>
              <span className="text-[#D1D1D1]">&bull;</span>
              <button
                type="button"
                className="flex items-center gap-1 text-[#2563EB] hover:underline"
              >
                <Play className="w-4 h-4" /> {t("products.hero.links.demo")}
              </button>
              <span className="text-[#D1D1D1]">&bull;</span>
              <a
                href="/talk-to-a-human"
                className="flex items-center gap-1 text-[#2563EB] hover:underline"
              >
                <Users className="w-4 h-4" /> {t("products.hero.links.talkToHuman")}
              </a>
            </div>
          </motion.div>

          <motion.div
            className="flex items-center justify-center shrink-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <img
              src="/product-os-hero.png"
              alt={t("products.hero.mascotAlt")}
              width={1024}
              height={1024}
              fetchPriority="high"
              className="max-w-[260px] sm:max-w-[280px] w-full h-auto"
              style={{ imageRendering: "auto" }}
            />
          </motion.div>
        </div>
      </section>

      <DataPlatformSection />

      {/* ── Automatic Tooling ── */}
      <section className="px-6 sm:px-8 py-6 border-b border-[#E5E5E5]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-bold text-[#1A1A1A]">
            {t("products.automaticTooling.title")}
          </h2>
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              className="text-[#2563EB] hover:underline flex items-center gap-1"
            >
              {t("products.automaticTooling.readme")} <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <span className="text-[#D1D1D1]">|</span>
            <button
              type="button"
              className="text-[#2563EB] hover:underline flex items-center gap-1"
            >
              {t("products.automaticTooling.llmInstructions")}{" "}
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p className="text-sm text-[#6B6B6B]">
          {t("products.automaticTooling.bodyBefore")}
          <a href="/docs/model-context-protocol" className="text-[#2563EB] hover:underline">
            {t("products.automaticTooling.mcp")}
          </a>
          {t("products.automaticTooling.bodyAfter")}
        </p>
      </section>

      <ProductCatalog />
    </div>
  );
}
