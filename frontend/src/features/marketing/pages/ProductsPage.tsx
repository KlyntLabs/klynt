import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Beaker,
  Bot,
  Check,
  ChevronDown,
  ClipboardList,
  Clock,
  Code2,
  Copy,
  Database,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Flag,
  Flame,
  GitBranch,
  Globe,
  LifeBuoy,
  Link as LinkIcon,
  Play,
  PlayCircle,
  Plug,
  Rocket,
  RotateCcw,
  TestTube,
  TrendingUp,
  Upload,
  Users,
  Webhook,
  Workflow,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  tab1Products,
  tab3Products,
  tab4Automation,
  tab4FeatureDev,
  tab4Feedback,
} from "@/features/marketing/data/products";

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */
const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

/* ------------------------------------------------------------------ */
/*  Icon map for products                                              */
/* ------------------------------------------------------------------ */
const productIconMap: Record<string, { icon: React.ReactNode; bg: string; color: string }> = {
  Globe: { icon: <Globe className="w-4 h-4" />, bg: "bg-[#DCFCE7]", color: "text-[#166534]" },
  BarChart3: {
    icon: <BarChart3 className="w-4 h-4" />,
    bg: "bg-[#FFF7ED]",
    color: "text-[#9A3412]",
  },
  PlayCircle: {
    icon: <PlayCircle className="w-4 h-4" />,
    bg: "bg-[#F3E8FF]",
    color: "text-[#6B21A8]",
  },
  Filter: { icon: <Filter className="w-4 h-4" />, bg: "bg-[#DBEAFE]", color: "text-[#1E40AF]" },
  Flame: { icon: <Flame className="w-4 h-4" />, bg: "bg-[#FEE2E2]", color: "text-[#991B1B]" },
  TrendingUp: {
    icon: <TrendingUp className="w-4 h-4" />,
    bg: "bg-[#DCFCE7]",
    color: "text-[#166534]",
  },
  RotateCcw: {
    icon: <RotateCcw className="w-4 h-4" />,
    bg: "bg-[#FEF9C3]",
    color: "text-[#854D0E]",
  },
  GitBranch: {
    icon: <GitBranch className="w-4 h-4" />,
    bg: "bg-[#DBEAFE]",
    color: "text-[#1E40AF]",
  },
  Bot: { icon: <Bot className="w-4 h-4" />, bg: "bg-[#F3E8FF]", color: "text-[#6B21A8]" },
  AlertTriangle: {
    icon: <AlertTriangle className="w-4 h-4" />,
    bg: "bg-[#FEE2E2]",
    color: "text-[#991B1B]",
  },
  FileText: { icon: <FileText className="w-4 h-4" />, bg: "bg-[#F3F4F6]", color: "text-[#374151]" },
  Clock: { icon: <Clock className="w-4 h-4" />, bg: "bg-[#DBEAFE]", color: "text-[#1E40AF]" },
  Flag: { icon: <Flag className="w-4 h-4" />, bg: "bg-[#DCFCE7]", color: "text-[#166534]" },
  Beaker: { icon: <Beaker className="w-4 h-4" />, bg: "bg-[#DBEAFE]", color: "text-[#1E40AF]" },
  TestTube: { icon: <TestTube className="w-4 h-4" />, bg: "bg-[#F3E8FF]", color: "text-[#6B21A8]" },
  Rocket: { icon: <Rocket className="w-4 h-4" />, bg: "bg-[#FFF7ED]", color: "text-[#9A3412]" },
  Plug: { icon: <Plug className="w-4 h-4" />, bg: "bg-[#F3F4F6]", color: "text-[#374151]" },
  Webhook: { icon: <Webhook className="w-4 h-4" />, bg: "bg-[#FEF9C3]", color: "text-[#854D0E]" },
  Workflow: { icon: <Workflow className="w-4 h-4" />, bg: "bg-[#DBEAFE]", color: "text-[#1E40AF]" },
  ClipboardList: {
    icon: <ClipboardList className="w-4 h-4" />,
    bg: "bg-[#FCE7F3]",
    color: "text-[#9D174D]",
  },
  LifeBuoy: { icon: <LifeBuoy className="w-4 h-4" />, bg: "bg-[#DCFCE7]", color: "text-[#166534]" },
  Users: { icon: <Users className="w-4 h-4" />, bg: "bg-[#F3E8FF]", color: "text-[#6B21A8]" },
};

/* ------------------------------------------------------------------ */
/*  Install / copy component                                           */
/* ------------------------------------------------------------------ */
function InstallCard() {
  const { t } = useTranslation("marketing");
  const [copied, setCopied] = useState(false);
  const [showFrameworks, setShowFrameworks] = useState(false);

  const command = t("products.hero.installCommand");
  const frameworks = t("products.hero.frameworks", { returnObjects: true }) as string[];

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(command).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [command]);

  return (
    <div className="border border-[#D1D1D1] rounded-lg p-4 bg-white">
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          className="flex items-center gap-1 px-3 py-1.5 bg-[#F5F3EF] hover:bg-[#EBE8E2] rounded-md text-sm font-medium transition-colors"
        >
          {t("products.hero.getStarted")} <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <code className="flex-1 bg-[#F5F3EF] rounded-md px-3 py-2 text-sm font-mono text-[#1A1A1A]">
          {command}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="h-9 w-9 flex items-center justify-center rounded-md bg-[#F5F3EF] hover:bg-[#EBE8E2] transition-colors border border-[#D1D1D1]"
          title={t("products.hero.copyTooltip")}
        >
          {copied ? (
            <Check className="w-4 h-4 text-[#22C55E]" />
          ) : (
            <Copy className="w-4 h-4 text-[#6B6B6B]" />
          )}
        </button>
      </div>
      <div className="text-xs text-[#6B6B6B]">
        {t("products.hero.supports")}{" "}
        <button type="button" className="text-[#2563EB] hover:underline">
          Next.js
        </button>
        ,{" "}
        <button type="button" className="text-[#2563EB] hover:underline">
          React
        </button>
        ,{" "}
        <button type="button" className="text-[#2563EB] hover:underline">
          Python
        </button>
        , {t("products.hero.and")}{" "}
        <button
          type="button"
          onClick={() => setShowFrameworks(!showFrameworks)}
          className="text-[#2563EB] hover:underline font-medium"
        >
          {t("products.hero.more")}
        </button>
        <AnimatePresence>
          {showFrameworks && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-1.5 mt-2">
                {frameworks.map((fw) => (
                  <span
                    key={fw}
                    className="px-2 py-0.5 bg-[#F5F3EF] rounded text-[11px] text-[#6B6B6B]"
                  >
                    {fw}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Expandable Data I/O card                                           */
/* ------------------------------------------------------------------ */
function DataIOCard({
  icon,
  title,
  items,
  linkText,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  linkText?: string;
}) {
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

/* ------------------------------------------------------------------ */
/*  Manage & Query card                                                */
/* ------------------------------------------------------------------ */
function ManageCard({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="border border-[#D1D1D1] rounded-lg p-4 bg-white hover:shadow-sm hover:border-[#C1C1C1] transition-all cursor-pointer flex items-center gap-3">
      <div className="w-8 h-8 rounded-md bg-[#F5F3EF] flex items-center justify-center text-[#6B6B6B]">
        {icon}
      </div>
      <span className="text-sm font-medium text-[#1A1A1A]">{title}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Product card                                                       */
/* ------------------------------------------------------------------ */
function ProductCard({
  product,
  tk,
}: {
  product: { labelKey: string; icon: string; route: string; descriptionKey?: string };
  tk: (key: string) => string;
}) {
  const config = productIconMap[product.icon] || {
    icon: <BarChart3 className="w-4 h-4" />,
    bg: "bg-[#F3F4F6]",
    color: "text-[#374151]",
  };

  return (
    <a
      href={product.route}
      className="flex items-center gap-3 p-3 rounded-lg border border-transparent hover:border-[#E5E5E5] hover:bg-[#FAFAF8] transition-all cursor-pointer group"
    >
      <div
        className={`w-8 h-8 rounded-lg ${config.bg} ${config.color} flex items-center justify-center shrink-0`}
      >
        {config.icon}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-medium text-[#1A1A1A] group-hover:text-[#2563EB] transition-colors">
          {tk(product.labelKey)}
        </div>
        {product.descriptionKey && (
          <div className="text-xs text-[#9CA3AF] truncate">{tk(product.descriptionKey)}</div>
        )}
      </div>
    </a>
  );
}

/* ================================================================== */
/*  MAIN PAGE                                                          */
/* ================================================================== */
export default function ProductsPage() {
  const { t } = useTranslation("marketing");
  const tk = (key: string) => t(key as never);

  const dataSources = t("data.dataSources", { returnObjects: true }) as unknown as string[];
  const dataExport = t("data.dataExport", { returnObjects: true }) as unknown as string[];
  const manageCards = t("products.dataPlatform.manageCards", {
    returnObjects: true,
  }) as unknown as {
    title: string;
  }[];

  return (
    <div className="w-full">
      {/* ── Hero ── */}
      <section className="px-6 sm:px-8 pt-6 sm:pt-7 pb-6 border-b border-[#E5E5E5]">
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-4">
          {/* Left: text */}
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

            {/* Link row */}
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

          {/* Right: illustration */}
          <motion.div
            className="flex items-center justify-center shrink-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <img
              src="/product-os-hero.png"
              alt={t("products.hero.mascotAlt")}
              className="max-w-[260px] sm:max-w-[280px] w-full h-auto"
              style={{ imageRendering: "auto" }}
            />
          </motion.div>
        </div>
      </section>

      {/* ── Data Platform ── */}
      <section className="px-6 sm:px-8 py-6 border-b border-[#E5E5E5]">
        {/* Header */}
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

        {/* Data I/O cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <DataIOCard
            icon={<Download className="w-4 h-4" />}
            title={t("products.dataPlatform.sourcesCard.title")}
            items={dataSources}
            linkText={t("products.dataPlatform.sourcesCard.link")}
          />
          <DataIOCard
            icon={<Upload className="w-4 h-4" />}
            title={t("products.dataPlatform.exportCard.title")}
            items={dataExport}
            linkText={t("products.dataPlatform.exportCard.link")}
          />
        </div>

        {/* Manage & Query */}
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

      {/* ── Product Grid ── */}
      <section className="px-6 sm:px-8 py-6 pb-8">
        {/* Category 1: Understand product usage */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
        >
          <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4">
            {t("products.categories.understand")}
          </h3>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {tab1Products.map((p) => (
              <motion.div key={p.id} variants={staggerItem}>
                <ProductCard product={p} tk={tk} />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Category 2: Debug & fix issues */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
        >
          <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4">
            {t("products.categories.debug")}
          </h3>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {tab3Products.map((p) => (
              <motion.div key={p.id} variants={staggerItem}>
                <ProductCard product={p} tk={tk} />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Category 3: Ship features & get feedback */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
        >
          <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4">
            {t("products.categories.ship")}
          </h3>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[...tab4FeatureDev, ...tab4Automation, ...tab4Feedback].map((p) => (
              <motion.div key={p.id} variants={staggerItem}>
                <ProductCard product={p} tk={tk} />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
