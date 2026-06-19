import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Beaker,
  Bot,
  Check,
  ClipboardList,
  Clock,
  Copy,
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
  Shuffle,
  TestTube,
  TrendingUp,
  User,
  Users,
  Webhook,
  Workflow,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";
import {
  dataExport,
  dataManageQuery,
  dataSources,
  engineerCustomers,
  pricingCards,
  tab1Products,
  tab3Products,
  tab4Automation,
  tab4FeatureDev,
  tab4Feedback,
  vcCustomers,
} from "@/features/marketing/data/homeData";

const iconMap: Record<string, React.ReactNode> = {
  Globe: <Globe className="w-7 h-7 text-[#2563EB]" />,
  BarChart3: <BarChart3 className="w-7 h-7 text-[#F76E18]" />,
  PlayCircle: <PlayCircle className="w-7 h-7 text-[#DC2626]" />,
  Filter: <Filter className="w-7 h-7 text-[#22C55E]" />,
  Flame: <Flame className="w-7 h-7 text-[#F76E18]" />,
  TrendingUp: <TrendingUp className="w-7 h-7 text-[#22C55E]" />,
  RotateCcw: <RotateCcw className="w-7 h-7 text-[#6B6B6B]" />,
  GitBranch: <GitBranch className="w-7 h-7 text-[#8B5CF6]" />,
  Bot: <Bot className="w-7 h-7 text-[#2563EB]" />,
  AlertTriangle: <AlertTriangle className="w-8 h-8 text-[#F76E18]" />,
  FileText: <FileText className="w-8 h-8 text-[#6B6B6B]" />,
  Clock: <Clock className="w-8 h-8 text-[#2563EB]" />,
  Flag: <Flag className="w-5 h-5 text-[#2563EB]" />,
  Beaker: <Beaker className="w-5 h-5 text-[#8B5CF6]" />,
  TestTube: <TestTube className="w-5 h-5 text-[#22C55E]" />,
  Rocket: <Rocket className="w-5 h-5 text-[#F76E18]" />,
  Plug: <Plug className="w-5 h-5 text-[#6B6B6B]" />,
  Webhook: <Webhook className="w-5 h-5 text-[#6B6B6B]" />,
  Workflow: <Workflow className="w-5 h-5 text-[#6B6B6B]" />,
  ClipboardList: <ClipboardList className="w-5 h-5 text-[#F76E18]" />,
  LifeBuoy: <LifeBuoy className="w-5 h-5 text-[#2563EB]" />,
  Users: <Users className="w-5 h-5 text-[#22C55E]" />,
  BarChart3Small: <BarChart3 className="w-5 h-5 text-[#F76E18]" />,
  PlayCircleSmall: <PlayCircle className="w-5 h-5 text-[#DC2626]" />,
};

function TypewriterText({ text, speed = 80 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);

  useEffect(() => {
    const fullText = text;
    let delta = speed;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (isDeleting) {
        setDisplayed((prev) => prev.slice(0, -1));
        delta = speed / 2;
      } else {
        setDisplayed(fullText.substring(0, displayed.length + 1));
        delta = speed;
      }

      if (!isDeleting && displayed === fullText) {
        delta = 2000;
        setIsDeleting(true);
      } else if (isDeleting && displayed === "") {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
        delta = 500;
      }

      timer = setTimeout(tick, delta);
    };

    timer = setTimeout(tick, delta);
    return () => clearTimeout(timer);
  }, [displayed, isDeleting, loopNum, text, speed]);

  return (
    <span>
      {displayed}
      <span className="animate-pulse">|</span>
    </span>
  );
}

const tabs = [
  { label: "Understand product usage", accent: "#22C55E" },
  { label: "One place for product data", accent: "#22C55E" },
  { label: "Debug & fix issues", accent: "#F76E18" },
  { label: "Test & roll out changes", accent: "#2563EB" },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [shuffledVC, setShuffledVC] = useState(vcCustomers);
  const [shuffledEng, setShuffledEng] = useState(engineerCustomers);
  const { openWindow } = useDesktopStore();

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText("npx @posthog/wizard").catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleShuffle = useCallback(() => {
    setShuffledVC((prev) => {
      const arr = [...prev];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    });
    setShuffledEng((prev) => {
      const arr = [...prev];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    });
  }, []);

  return (
    <div className="min-w-0">
      {/* Hero Section */}
      <section className="mb-8">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left: Text */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
            }}
            className="flex-1 min-w-0"
          >
            {/* Logo Lockup */}
            <div className="flex items-center gap-2 mb-5">
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="32" height="32" rx="6" fill="#1A1A2E" />
                <path d="M8 10h3v8h5v-8h3v12h-3v-4h-5v4H8V10z" fill="#F76E18" />
                <circle cx="22" cy="12" r="2" fill="#F76E18" />
              </svg>
              <span className="text-xl font-bold tracking-tight text-[#1A1A1A]">PostHog</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl font-bold text-[#1A1A1A] leading-tight mb-3">
              The new way to build products
            </h1>

            {/* Subheadline */}
            <p className="text-base text-[#6B6B6B] leading-relaxed mb-1">
              Product development used to mean manually writing code, running analysis, diagnosing
              bugs, and rolling out changes using dozens of tools.
            </p>
            <p className="text-base text-[#6B6B6B] leading-relaxed mb-5">
              PostHog is the only platform that acts like a co-pilot for you (and your AI agents) to
              do it all —{" "}
              <em className="text-[#1A1A1A]">
                <TypewriterText text="autonomously" speed={80} />
              </em>
              .
            </p>

            {/* CTA Row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="flex flex-wrap gap-3 mb-4"
            >
              <button
                onClick={() => openWindow("/pricing", "Pricing")}
                className="px-5 py-2.5 rounded-md bg-[#F76E18] hover:bg-[#E56310] text-white font-semibold transition-colors"
              >
                Get started - free
              </button>
              <button className="px-5 py-2.5 rounded-md border border-[#D1D1D1] bg-white text-[#1A1A1A] font-medium hover:bg-[#F5F3EF] transition-colors">
                Install with AI
              </button>
            </motion.div>

            {/* Install Command */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="mb-4"
            >
              <div className="flex items-center gap-2 bg-[#F5F3EF] border border-[#E5E5E5] rounded-md px-4 py-2.5">
                <code className="text-sm font-mono text-[#1A1A1A] flex-1">npx @posthog/wizard</code>
                <button
                  onClick={handleCopy}
                  className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#E5E5E5] transition-colors"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-[#22C55E]" />
                  ) : (
                    <Copy className="w-4 h-4 text-[#6B6B6B]" />
                  )}
                </button>
              </div>
              <p className="text-xs text-[#9CA3AF] mt-1.5">
                Install with AI in a single prompt. Paste into your terminal or code editor and make
                AI do the work.
              </p>
            </motion.div>

            {/* Link Row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="flex items-center gap-2 text-sm text-[#6B6B6B]"
            >
              <button
                onClick={() => openWindow("/docs", "Docs")}
                className="text-[#2563EB] hover:underline flex items-center gap-1"
              >
                <LinkIcon className="w-3.5 h-3.5" /> MCP
              </button>
              <span>&bull;</span>
              <button
                onClick={() => openWindow("/demo", "demo.mov")}
                className="text-[#2563EB] hover:underline flex items-center gap-1"
              >
                <Play className="w-3.5 h-3.5" /> Watch a demo
              </button>
              <span>&bull;</span>
              <button
                onClick={() => openWindow("/talk-to-a-human", "Talk to a human")}
                className="text-[#2563EB] hover:underline flex items-center gap-1"
              >
                <User className="w-3.5 h-3.5" /> Talk to a human
              </button>
            </motion.div>
          </motion.div>

          {/* Right: Hero Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center justify-center shrink-0"
          >
            <img
              src="/hedgehog-hero.png"
              alt="Hedgehog mascot"
              className="w-[260px] h-auto animate-bounce"
              style={{ animation: "float 3s ease-in-out infinite" }}
            />
          </motion.div>
        </div>
      </section>

      {/* Content Tabs */}
      <section className="mb-8">
        {/* Tab Bar */}
        <div className="flex border border-[#D1D1D1] rounded-t-lg bg-[#F0EDE6] p-1 gap-1">
          {tabs.map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setActiveTab(idx)}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-150 ${
                activeTab === idx ? "bg-white shadow-sm" : "text-[#6B6B6B] hover:bg-white/50"
              }`}
              style={activeTab === idx ? { borderBottom: `2px solid ${tab.accent}` } : undefined}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="border border-t-0 border-[#D1D1D1] rounded-b-lg bg-white p-6">
          <AnimatePresence mode="wait">
            {activeTab === 0 && (
              <motion.div
                key="tab0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2">Understand what users are doing</h3>
                    <p className="text-sm text-[#6B6B6B] mb-3">
                      Measure engagement, track conversion, and understand usage patterns – whether
                      it&apos;s by person, company, or AI feature.
                    </p>
                    <button
                      onClick={() => openWindow("/products", "Product OS")}
                      className="text-sm text-[#2563EB] hover:underline"
                    >
                      How we analyze data and build products has changed a lot. Work smarter with
                      PostHog AI to get direct answers to questions about your data.
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {tab1Products.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => openWindow(product.route, product.label)}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-md hover:bg-[#F5F3EF] transition-colors"
                      >
                        {iconMap[product.icon] || <Globe className="w-7 h-7 text-[#6B6B6B]" />}
                        <span className="text-xs font-medium text-center text-[#1A1A1A]">
                          {product.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 1 && (
              <motion.div
                key="tab1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="text-lg font-semibold mb-2">
                  Build better products with better data
                </h3>
                <p className="text-sm text-[#6B6B6B] mb-4">
                  Not your mama&apos;s data integrations. Third party data is imported into
                  PostHog&apos;s CDP and warehouse as a first-class citizen. This means you can
                  query third party data and product usage data, leading to more informed decisions.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Data sources & import</h4>
                    <div className="flex flex-wrap gap-1">
                      {dataSources.map((s) => (
                        <span key={s} className="bg-[#F5F3EF] text-xs px-2 py-1 rounded-md">
                          {s}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => openWindow("/products", "Product OS")}
                      className="text-xs text-[#2563EB] hover:underline mt-2"
                    >
                      Explore data sources (159)
                    </button>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Manage & query</h4>
                    <div className="flex flex-wrap gap-1">
                      {dataManageQuery.map((s) => (
                        <span key={s} className="bg-[#F5F3EF] text-xs px-2 py-1 rounded-md">
                          {s}
                        </span>
                      ))}
                    </div>
                    <button className="text-xs text-[#2563EB] hover:underline mt-2">
                      Data stack README
                    </button>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Reverse ETL & export</h4>
                    <div className="flex flex-wrap gap-1">
                      {dataExport.map((s) => (
                        <span key={s} className="bg-[#F5F3EF] text-xs px-2 py-1 rounded-md">
                          {s}
                        </span>
                      ))}
                    </div>
                    <button className="text-xs text-[#2563EB] hover:underline mt-2">
                      Explore destinations (112)
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 2 && (
              <motion.div
                key="tab2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="text-lg font-semibold mb-2">Debug & fix issues faster</h3>
                <p className="text-sm text-[#6B6B6B] mb-4">
                  See exactly what went wrong with session replay, error tracking, and logs.
                  Understand the full context of user issues without guessing.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {tab3Products.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => openWindow(product.route, product.label)}
                      className="flex flex-col gap-2 p-4 border border-[#E5E5E5] rounded-md hover:shadow-sm hover:border-[#D1D1D1] transition-all text-left"
                    >
                      {iconMap[product.icon] || <FileText className="w-8 h-8 text-[#6B6B6B]" />}
                      <span className="font-semibold text-sm">{product.label}</span>
                      <span className="text-xs text-[#6B6B6B]">{product.description}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 3 && (
              <motion.div
                key="tab3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="text-lg font-semibold mb-2">Ship features safely & get feedback</h3>
                <p className="text-sm text-[#6B6B6B] mb-2">
                  Now that you know what&apos;s happening, you can make informed decisions about
                  what to build. PostHog helps you roll out features to specific users or groups,
                  then test and validate ideas before you ship them to everyone.
                </p>
                <p className="text-sm text-[#6B6B6B] mb-4">
                  And you can build it all with PostHog Code, our new AI code editor.
                </p>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">
                      Feature development
                    </h4>
                    <div className="space-y-1">
                      {tab4FeatureDev.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => openWindow(item.route, item.label)}
                          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#F5F3EF] transition-colors w-full text-left"
                        >
                          {iconMap[item.icon] || <Flag className="w-5 h-5 text-[#6B6B6B]" />}
                          <span className="text-sm font-medium">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">
                      Data APIs & automation
                    </h4>
                    <div className="space-y-1">
                      {tab4Automation.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => openWindow(item.route, item.label)}
                          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#F5F3EF] transition-colors w-full text-left"
                        >
                          {iconMap[item.icon] || <Plug className="w-5 h-5 text-[#6B6B6B]" />}
                          <span className="text-sm font-medium">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">
                      Feedback & training
                    </h4>
                    <div className="space-y-1">
                      {tab4Feedback.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => openWindow(item.route, item.label)}
                          className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#F5F3EF] transition-colors w-full text-left"
                        >
                          {iconMap[item.icon] || <Users className="w-5 h-5 text-[#6B6B6B]" />}
                          <span className="text-sm font-medium">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Customer Logos */}
      <section className="mb-8 pt-6 border-t border-[#E5E5E5]">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold text-[#1A1A1A]">Who&apos;s using PostHog?</h2>
            <p className="text-sm text-[#6B6B6B] mt-1">
              Here are some of our paying customers. (Yes they actually use us, no it&apos;s not
              just some random engineer who tried us out 2+ years ago.)
            </p>
          </div>
          <button
            onClick={handleShuffle}
            className="flex items-center gap-1.5 text-sm text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors shrink-0"
          >
            <Shuffle className="w-4 h-4" />
            Shuffle companies
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-3">
              VCs love them
            </h4>
            <div className="flex flex-wrap gap-3">
              {shuffledVC.map((c) => (
                <div
                  key={c.id}
                  className="h-8 px-3 flex items-center bg-[#F5F3EF] rounded-md text-sm font-medium text-[#6B6B6B] grayscale hover:grayscale-0 transition-all duration-200 cursor-pointer"
                >
                  {c.logo}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-3">
              Product engineers love them
            </h4>
            <div className="flex flex-wrap gap-3">
              {shuffledEng.map((c) => (
                <div
                  key={c.id}
                  className="h-8 px-3 flex items-center bg-[#F5F3EF] rounded-md text-sm font-medium text-[#6B6B6B] grayscale hover:grayscale-0 transition-all duration-200 cursor-pointer"
                >
                  {c.logo}
                </div>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={() => openWindow("/customers", "customers.mdx")}
          className="text-sm text-[#2563EB] hover:underline mt-4 inline-block"
        >
          Open customers.mdx
        </button>
      </section>

      {/* Data Stack */}
      <section className="mb-8 pt-6 border-t border-[#E5E5E5]">
        <h2 className="text-2xl font-bold text-[#1A1A1A] mb-3">
          PostHog data stack, built for data teams and loved by product teams
        </h2>
        <p className="text-base text-[#6B6B6B] mb-2">
          When you&apos;re analyzing how customers use your product, you should be operating from
          the full set of data.
        </p>
        <p className="text-sm text-[#6B6B6B] mb-4">
          This includes customer information that happens outside your product: payments from
          Stripe, exceptions in an error tracking tool, tickets in your support platform.
        </p>
        <p className="text-sm text-[#6B6B6B] mb-4">
          Having all the data in one place means you can make more informed decisions about what to
          build next. PostHog&apos;s Product OS isn&apos;t just analytics – it&apos;s the entire
          suite of tools built to give you a single source of truth about your customers.
        </p>

        <ul className="space-y-1 mb-4">
          {[
            "A data warehouse",
            "120+ sources/destinations",
            "SQL editor + BI + data viz",
            "User activity feed (CDP-lite)",
            "API, webhooks",
          ].map((item) => (
            <li key={item} className="flex items-center gap-3 py-1.5">
              <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="6" fill="#F76E18" />
                <path d="M8 16l6 6 10-10" stroke="white" strokeWidth="3" fill="none" />
              </svg>
              <span className="text-sm font-medium">{item}</span>
            </li>
          ))}
        </ul>

        <button className="text-sm text-[#2563EB] hover:underline">
          README: PostHog data stack.md
        </button>
      </section>

      {/* Usage-Based Pricing */}
      <section className="pt-6 border-t border-[#E5E5E5]">
        <h2 className="text-2xl font-bold text-[#1A1A1A] mb-3">Usage-based pricing</h2>
        <p className="text-base text-[#1A1A1A] font-medium mb-2">
          Our whole philosophy is that you shouldn&apos;t have to worry about pricing.
        </p>
        <p className="text-sm text-[#6B6B6B] mb-2">
          All our paid products are pay-per-use with generous monthly free tiers. In fact, 98% of
          our customers use PostHog for free.
        </p>
        <p className="text-sm text-[#6B6B6B] mb-6">
          We aim to match the cheapest option at scale – PostHog should be a no-brainer. You never
          have to &quot;jump on a quick call&quot; with sales.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          {pricingCards.map((card) => (
            <motion.div
              key={card.product}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: pricingCards.indexOf(card) * 0.075 }}
              className="border border-[#D1D1D1] rounded-lg p-4 bg-white"
            >
              <div className="flex items-center gap-2 mb-2">
                {iconMap[card.icon] || <BarChart3 className="w-5 h-5 text-[#F76E18]" />}
                <span className="text-sm font-semibold">{card.product}</span>
              </div>
              <p className="text-xs text-[#22C55E] mb-1">{card.freeTier}</p>
              <p className="text-sm text-[#1A1A1A]">{card.paidRate}</p>
            </motion.div>
          ))}
        </div>

        <button
          onClick={() => openWindow("/pricing", "Pricing")}
          className="text-sm text-[#2563EB] hover:underline mt-2 inline-block"
        >
          See all pricing &rarr;
        </button>
      </section>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
