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

import {
  dataExport,
  dataSources,
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
  const [copied, setCopied] = useState(false);
  const [showFrameworks, setShowFrameworks] = useState(false);

  const command = "npx -y @posthog/wizard";

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(command).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  return (
    <div className="border border-[#D1D1D1] rounded-lg p-4 bg-white">
      <div className="flex items-center gap-2 mb-3">
        <button className="flex items-center gap-1 px-3 py-1.5 bg-[#F5F3EF] hover:bg-[#EBE8E2] rounded-md text-sm font-medium transition-colors">
          Get started <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <code className="flex-1 bg-[#F5F3EF] rounded-md px-3 py-2 text-sm font-mono text-[#1A1A1A]">
          {command}
        </code>
        <button
          onClick={handleCopy}
          className="h-9 w-9 flex items-center justify-center rounded-md bg-[#F5F3EF] hover:bg-[#EBE8E2] transition-colors border border-[#D1D1D1]"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="w-4 h-4 text-[#22C55E]" />
          ) : (
            <Copy className="w-4 h-4 text-[#6B6B6B]" />
          )}
        </button>
      </div>
      <div className="text-xs text-[#6B6B6B]">
        Supports{" "}
        <a href="#" className="text-[#2563EB] hover:underline">
          Next.js
        </a>
        ,{" "}
        <a href="#" className="text-[#2563EB] hover:underline">
          React
        </a>
        ,{" "}
        <a href="#" className="text-[#2563EB] hover:underline">
          Python
        </a>
        , and{" "}
        <button
          onClick={() => setShowFrameworks(!showFrameworks)}
          className="text-[#2563EB] hover:underline font-medium"
        >
          21 more
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
                {[
                  "Vue",
                  "Svelte",
                  "Angular",
                  "Ruby on Rails",
                  "Django",
                  "Laravel",
                  "Go",
                  "Rust",
                  "Java",
                  "PHP",
                  "Node.js",
                  "Remix",
                  "Nuxt",
                  "SvelteKit",
                  "Gatsby",
                  "Astro",
                  "Express",
                  "FastAPI",
                  "Laravel",
                  "Rails",
                  "Elixir",
                ].map((fw) => (
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
  linkHref,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  linkText?: string;
  linkHref?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-[#D1D1D1] rounded-lg bg-white overflow-hidden">
      <button
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
                <a
                  href={linkHref || "#"}
                  className="inline-flex items-center gap-1 mt-3 text-xs text-[#2563EB] hover:underline"
                >
                  {linkText} <ExternalLink className="w-3 h-3" />
                </a>
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
}: {
  product: { label: string; icon: string; route: string; description?: string };
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
          {product.label}
        </div>
        {product.description && (
          <div className="text-xs text-[#9CA3AF] truncate">{product.description}</div>
        )}
      </div>
    </a>
  );
}

/* ================================================================== */
/*  MAIN PAGE                                                          */
/* ================================================================== */
export default function ProductsPage() {
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
              Devtools and product data infrastructure for building successful products
            </h1>
            <p className="text-base text-[#6B6B6B] leading-relaxed mb-5">
              Humans and AI agents build with PostHog because everything you need to collect and
              analyze product usage data &ndash; and build and ship new features &ndash; lives in
              one place.
            </p>

            <InstallCard />

            {/* Link row */}
            <div className="flex flex-wrap items-center gap-3 mt-5 text-sm">
              <a
                href="/docs/model-context-protocol"
                className="flex items-center gap-1 text-[#2563EB] hover:underline"
              >
                <LinkIcon className="w-4 h-4" /> MCP
              </a>
              <span className="text-[#D1D1D1]">&bull;</span>
              <a href="#" className="flex items-center gap-1 text-[#2563EB] hover:underline">
                <Play className="w-4 h-4" /> Watch a demo
              </a>
              <span className="text-[#D1D1D1]">&bull;</span>
              <a
                href="/talk-to-a-human"
                className="flex items-center gap-1 text-[#2563EB] hover:underline"
              >
                <Users className="w-4 h-4" /> Talk to a human
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
              alt="Hedgehog at desk with laptop"
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
          <h2 className="text-2xl font-bold text-[#1A1A1A]">Data platform</h2>
          <a href="#" className="text-sm text-[#2563EB] hover:underline flex items-center gap-1">
            Data stack README <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        <p className="text-sm text-[#6B6B6B] mb-5">
          Having all your product data in one place means you can make more informed decisions. Push
          all your data to PostHog, then send it anywhere else you need, too.
        </p>

        {/* Data I/O cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <DataIOCard
            icon={<Download className="w-4 h-4" />}
            title="Data sources & import (ELT)"
            items={dataSources}
            linkText="View all integrations"
            linkHref="#"
          />
          <DataIOCard
            icon={<Upload className="w-4 h-4" />}
            title="Reverse ETL & export"
            items={dataExport}
            linkText="View all destinations"
            linkHref="#"
          />
        </div>

        {/* Manage & Query */}
        <div className="mb-2">
          <h3 className="text-sm font-semibold text-[#1A1A1A] mb-3">Manage & query</h3>
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {[
              { icon: <Code2 className="w-4 h-4" />, title: "Data modeling" },
              { icon: <Database className="w-4 h-4" />, title: "Managed warehouse" },
              { icon: <Webhook className="w-4 h-4" />, title: "CDP" },
              { icon: <FileText className="w-4 h-4" />, title: "SQL editor" },
              { icon: <BarChart3 className="w-4 h-4" />, title: "BI" },
            ].map((card, i) => (
              <motion.div key={card.title} variants={staggerItem} custom={i}>
                <ManageCard icon={card.icon} title={card.title} />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Automatic Tooling ── */}
      <section className="px-6 sm:px-8 py-6 border-b border-[#E5E5E5]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-bold text-[#1A1A1A]">Automatic tooling</h2>
          <div className="flex items-center gap-2 text-sm">
            <a href="#" className="text-[#2563EB] hover:underline flex items-center gap-1">
              Tooling README <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <span className="text-[#D1D1D1]">|</span>
            <a href="#" className="text-[#2563EB] hover:underline flex items-center gap-1">
              Instructions for LLMs <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
        <p className="text-sm text-[#6B6B6B]">
          In a previous era of building products, you&apos;d need to configure event tracking and
          feature flags manually. Now, your AI coding agent can use the{" "}
          <a href="/docs/model-context-protocol" className="text-[#2563EB] hover:underline">
            PostHog MCP
          </a>{" "}
          to configure PostHog without leaving your ADE.
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
          <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4">Understand product usage</h3>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {tab1Products.map((p) => (
              <motion.div key={p.id} variants={staggerItem}>
                <ProductCard product={p} />
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
          <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4">Debug &amp; fix issues</h3>
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {tab3Products.map((p) => (
              <motion.div key={p.id} variants={staggerItem}>
                <ProductCard product={p} />
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
            Ship features &amp; get feedback
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
                <ProductCard product={p} />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
