import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  Code2,
  Download,
  FileCode,
  Globe,
  Play,
  RefreshCw,
  Route,
  Shield,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface SlideData {
  id: number;
  title: string;
  bg: string;
  render: () => React.JSX.Element;
  notes: string;
}

/* ------------------------------------------------------------------ */
/*  Animation variants                                                 */
/* ------------------------------------------------------------------ */
const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 30 : -30 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -30 : 30 }),
};

const slideTransition = {
  x: { type: "spring" as const, stiffness: 400, damping: 32 },
  opacity: { duration: 0.2 },
};

/* ------------------------------------------------------------------ */
/*  Slide content components                                           */
/* ------------------------------------------------------------------ */

/* ── Slide 1: Title ── */
function SlideTitle() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F76E18] to-[#FFB224] flex items-center justify-center mb-6 shadow-lg">
        <BarChart3 className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-4xl font-bold text-[#1A1A1A] tracking-tight">Product Analytics</h1>
      <p className="text-xl text-[#6B6B6B] mt-3">Understand your product with PostHog</p>
      <p className="text-base text-[#9CA3AF] mt-2">
        The complete analytics toolkit for product engineers
      </p>
      <p className="text-sm text-[#9CA3AF] mt-12 animate-pulse">Press &rarr; to start</p>
    </div>
  );
}

/* ── Slide 2: What You Can Track ── */
function SlideTrack() {
  const items = [
    "Pageviews and clicks",
    "Custom events with properties",
    "User sessions and flows",
    "Conversion funnels",
    "Retention and engagement",
    "Feature usage and adoption",
  ];
  return (
    <div className="flex items-center h-full px-8 gap-8">
      <div className="flex-1">
        <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">Track everything that matters</h2>
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-3 text-[#1A1A1A]">
              <span className="w-5 h-5 rounded-full bg-[#22C55E]/15 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-[#22C55E]" />
              </span>
              <span className="text-sm">{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="w-48 h-48 rounded-2xl bg-gradient-to-br from-[#F5F3EF] to-[#E8E4DC] flex items-center justify-center">
          <BarChart3 className="w-20 h-20 text-[#F76E18] opacity-40" />
        </div>
      </div>
    </div>
  );
}

/* ── Slide 3: Key Features ── */
function SlideFeatures() {
  const features = [
    {
      icon: TrendingUp,
      title: "Trend analysis",
      desc: "Track metrics over time with powerful filtering",
    },
    { icon: Target, title: "Funnels", desc: "See where users drop off in your flows" },
    { icon: RefreshCw, title: "Retention", desc: "Understand how users come back" },
    { icon: Route, title: "Paths", desc: "Visualize user navigation patterns" },
    { icon: Users, title: "Cohorts", desc: "Group users by behavior" },
    { icon: FileCode, title: "SQL access", desc: "Query your raw data directly" },
  ];
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <h2 className="text-2xl font-bold text-[#1A1A1A] mb-8">Everything you need</h2>
      <div className="grid grid-cols-3 gap-4 w-full max-w-xl">
        {features.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="border border-[#E5E5E5] rounded-xl p-5 flex flex-col items-center text-center hover:border-[#F76E18]/30 hover:shadow-sm transition-all"
          >
            <Icon className="w-7 h-7 text-[#F76E18] mb-2" />
            <span className="text-sm font-semibold text-[#1A1A1A]">{title}</span>
            <span className="text-xs text-[#6B6B6B] mt-1">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Slide 4: Autocapture ── */
function SlideAutocapture() {
  return (
    <div className="flex items-center h-full px-8 gap-8">
      <div className="flex-1">
        <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">
          Autocapture — data without the setup
        </h2>
        <p className="text-sm text-[#6B6B6B] mb-4">
          Just install PostHog and we automatically capture:
        </p>
        <ul className="space-y-2 text-sm text-[#1A1A1A]">
          {["Every pageview", "Every click", "Every form submission", "Every input change"].map(
            (t) => (
              <li key={t} className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                {t}
              </li>
            )
          )}
        </ul>
        <p className="text-sm text-[#6B6B6B] mt-4">No manual tracking code required.</p>
      </div>
      <div className="flex-1">
        <div className="bg-[#1A1A1A] text-[#22C55E] font-mono text-sm p-5 rounded-xl shadow-lg">
          <span className="text-[#9CA3AF]">{"// Just this one line"}</span>
          <br />
          <span className="text-[#F76E18]">posthog</span>
          <span className="text-white">.init(</span>
          <span className="text-[#FEBC2E]">&apos;YOUR_API_KEY&apos;</span>
          <span className="text-white">)</span>
          <br />
          <br />
          <span className="text-[#9CA3AF]">{"// That's it. Really."}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Slide 5: Privacy ── */
function SlidePrivacy() {
  const pillars = [
    { icon: Globe, title: "EU hosting", desc: "Choose where your data lives. EU or US." },
    {
      icon: Shield,
      title: "No third-party cookies",
      desc: "We don't use third-party cookies. Ever.",
    },
    { icon: Code2, title: "Open source", desc: "Our code is open source. Audit it yourself." },
  ];
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <h2 className="text-2xl font-bold text-[#1A1A1A] mb-8">Your data, your rules</h2>
      <div className="flex gap-6 w-full max-w-xl">
        {pillars.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex-1 border border-[#E5E5E5] rounded-xl p-5 flex flex-col items-center text-center"
          >
            <div className="w-12 h-12 rounded-full bg-[#F5F3EF] flex items-center justify-center mb-3">
              <Icon className="w-6 h-6 text-[#F76E18]" />
            </div>
            <span className="text-sm font-semibold text-[#1A1A1A]">{title}</span>
            <span className="text-xs text-[#6B6B6B] mt-1">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Slide 6: Pricing ── */
function SlidePricing() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">Simple, usage-based pricing</h2>
      <div className="border border-[#E5E5E5] rounded-2xl p-8 w-full max-w-xs text-center shadow-sm">
        <p className="text-base font-semibold text-[#1A1A1A]">Product Analytics</p>
        <p className="text-3xl font-bold text-[#22C55E] mt-3">First 1M events/mo</p>
        <p className="text-sm text-[#22C55E] mt-1">Free forever</p>
        <div className="border-t border-[#E5E5E5] my-4" />
        <p className="text-sm text-[#6B6B6B]">Then $0.00005 per event</p>
        <p className="text-xs text-[#9CA3AF] mt-1">No hidden fees. No surprises.</p>
      </div>
      <Button className="mt-6 bg-[#F76E18] hover:bg-[#E56310] text-white rounded-lg px-6">
        Get started free <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}

/* ── Slide 7: Integration ── */
function SlideIntegration() {
  const frameworks = [
    "React",
    "Vue",
    "Angular",
    "Next.js",
    "Python",
    "Ruby",
    "Go",
    "iOS",
    "Android",
  ];
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">Works with your stack</h2>
      <div className="flex flex-wrap justify-center gap-4 mb-8 max-w-md">
        {frameworks.map((fw) => (
          <span
            key={fw}
            className="px-3 py-1.5 rounded-lg bg-[#F5F3EF] text-xs font-medium text-[#6B6B6B] hover:bg-[#E8E4DC] hover:text-[#1A1A1A] transition-colors cursor-default"
          >
            {fw}
          </span>
        ))}
      </div>
      <div className="bg-[#1A1A1A] text-[#22C55E] font-mono text-sm p-5 rounded-xl shadow-lg w-full max-w-sm">
        <span className="text-[#9CA3AF]">{"// React"}</span>
        <br />
        <span className="text-[#C084FC]">import</span>{" "}
        <span className="text-white">{"{ usePostHog }"}</span>{" "}
        <span className="text-[#C084FC]">from</span>{" "}
        <span className="text-[#FEBC2E]">&apos;posthog-js/react&apos;</span>
        <br />
        <br />
        <span className="text-[#9CA3AF]">{"// One hook, infinite insights"}</span>
        <br />
        <span className="text-[#C084FC]">const</span>{" "}
        <span className="text-[#60A5FA]">posthog</span> <span className="text-white">=</span>{" "}
        <span className="text-[#F76E18]">usePostHog</span>
        <span className="text-white">()</span>
      </div>
    </div>
  );
}

/* ── Slide 8: CTA ── */
function SlideCTA() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      <h2 className="text-3xl font-bold text-[#1A1A1A]">Ready to understand your users?</h2>
      <p className="text-base text-[#6B6B6B] mt-3">Join 100,000+ companies using PostHog</p>
      <div className="flex gap-3 mt-8">
        <Button className="bg-[#F76E18] hover:bg-[#E56310] text-white rounded-lg px-5">
          Get started — free
        </Button>
        <Button variant="outline" className="rounded-lg px-5 border-[#D1D1D1]">
          Talk to a human
        </Button>
      </div>
      <div className="mt-6 bg-[#F5F3EF] font-mono text-sm px-4 py-2 rounded-lg flex items-center gap-2">
        <span>npm install posthog-js</span>
        <button
          className="text-[#9CA3AF] hover:text-[#1A1A1A] transition-colors"
          onClick={() => navigator.clipboard?.writeText("npm install posthog-js")}
          title="Copy"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function ProductAnalyticsPage() {
  const slides: SlideData[] = [
    {
      id: 1,
      title: "Title",
      bg: "bg-white",
      render: SlideTitle,
      notes:
        "Welcome to Product Analytics. This is our core product — the thing that started it all. Let's walk through what makes PostHog's analytics different.",
    },
    {
      id: 2,
      title: "What You Can Track",
      bg: "bg-white",
      render: SlideTrack,
      notes:
        "PostHog autocaptures pageviews and clicks automatically. Add custom events for deeper insights. Track the full user journey from first visit to power user.",
    },
    {
      id: 3,
      title: "Key Features",
      bg: "bg-white",
      render: SlideFeatures,
      notes:
        "Six core analysis tools. Each one is designed to answer a specific type of product question. Use them individually or combine for deeper insights.",
    },
    {
      id: 4,
      title: "Autocapture",
      bg: "bg-white",
      render: SlideAutocapture,
      notes:
        "The magic of autocapture — install PostHog and data starts flowing immediately. No need to define every event upfront. Retroactively define events using our 'Actions' feature.",
    },
    {
      id: 5,
      title: "Privacy",
      bg: "bg-white",
      render: SlidePrivacy,
      notes:
        "Privacy isn't an afterthought. Choose your data region, no third-party cookies, and our code is open source. The cookie banner isn't just a joke — it's a statement.",
    },
    {
      id: 6,
      title: "Pricing",
      bg: "bg-white",
      render: SlidePricing,
      notes:
        "Generous free tier — 1 million events per month. Most startups never pay a cent. When you do grow, our pricing is transparent and usage-based.",
    },
    {
      id: 7,
      title: "Integration",
      bg: "bg-white",
      render: SlideIntegration,
      notes:
        "SDKs for every major framework. React, Vue, Angular, mobile, backend — we've got you covered. Install takes less than 5 minutes.",
    },
    {
      id: 8,
      title: "Get Started",
      bg: "bg-white",
      render: SlideCTA,
      notes:
        "That's Product Analytics. The easiest way to start is to install PostHog and let autocapture do the work. Questions? Talk to a human — we actually respond.",
    },
  ];

  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const goTo = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= slides.length) return;
      setDirection(idx > current ? 1 : -1);
      setCurrent(idx);
    },
    [current, slides.length]
  );

  const goNext = useCallback(() => goTo(current + 1), [current, goTo]);
  const goPrev = useCallback(() => goTo(current - 1), [current, goTo]);

  /* Keyboard navigation */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(slides.length - 1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, goTo, slides.length]);

  const CurrentSlide = slides[current].render;

  return (
    <div className="flex flex-col h-full select-none">
      {/* Top toolbar */}
      <div className="flex items-center justify-end px-4 py-2 border-b border-[#E5E5E5] bg-white gap-2 shrink-0">
        <button className="flex items-center gap-1.5 text-xs text-[#6B6B6B] hover:text-[#1A1A1A] px-3 py-1.5 rounded-md border border-[#D1D1D1] hover:bg-[#F5F3EF] transition-colors">
          <Download className="w-3.5 h-3.5" />
          Export PDF
        </button>
        <button className="flex items-center gap-1.5 text-xs text-white bg-[#1A1A1A] hover:bg-[#333] px-3 py-1.5 rounded-md transition-colors">
          <Play className="w-3.5 h-3.5" />
          Present
        </button>
        <Button
          size="sm"
          className="bg-[#F76E18] hover:bg-[#E56310] text-white text-xs rounded-md ml-1"
        >
          Get started — free
        </Button>
      </div>

      {/* Main area */}
      <div className="flex flex-1 min-h-0">
        {/* Slide thumbnails panel */}
        <div className="w-[180px] shrink-0 bg-[#F5F3EF] border-r border-[#E5E5E5] overflow-y-auto p-3">
          {slides.map((slide, idx) => (
            <button
              key={slide.id}
              onClick={() => goTo(idx)}
              className={`w-full mb-2 text-left group ${
                idx === current ? "ring-2 ring-[#F76E18] rounded" : ""
              }`}
            >
              <div
                className={`w-full aspect-[4/3] rounded border bg-white relative overflow-hidden transition-opacity ${
                  idx === current
                    ? "border-[#F76E18] shadow-sm"
                    : "border-[#D1D1D1] opacity-70 group-hover:opacity-100"
                }`}
              >
                {/* Mini thumbnail content */}
                <div className="absolute inset-0 flex items-center justify-center p-1">
                  {idx === 0 && <BarChart3 className="w-4 h-4 text-[#F76E18]" />}
                  {idx === 1 && (
                    <div className="flex flex-col gap-0.5 w-full px-1">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-0.5 bg-[#E5E5E5] rounded" />
                      ))}
                    </div>
                  )}
                  {idx === 2 && (
                    <div className="grid grid-cols-3 gap-0.5 w-full px-1">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-2 bg-[#F5F3EF] rounded-sm" />
                      ))}
                    </div>
                  )}
                  {idx === 3 && (
                    <div className="bg-[#1A1A1A] text-[6px] text-[#22C55E] font-mono px-1 py-0.5 rounded">
                      {"{ }"}
                    </div>
                  )}
                  {idx === 4 && (
                    <div className="flex gap-0.5">
                      <Shield className="w-3 h-3 text-[#F76E18]" />
                      <Globe className="w-3 h-3 text-[#2563EB]" />
                      <Code2 className="w-3 h-3 text-[#22C55E]" />
                    </div>
                  )}
                  {idx === 5 && (
                    <div className="text-center">
                      <span className="text-[6px] font-bold text-[#22C55E]">FREE</span>
                    </div>
                  )}
                  {idx === 6 && (
                    <div className="flex flex-wrap gap-0.5 justify-center px-1">
                      {["Re", "Vu", "Py"].map((t) => (
                        <span key={t} className="text-[5px] px-0.5 bg-[#F5F3EF] rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                  {idx === 7 && <ArrowRight className="w-4 h-4 text-[#F76E18]" />}
                </div>
                {/* Slide number */}
                <span className="absolute bottom-0.5 left-1 text-[9px] text-[#9CA3AF]">
                  {idx + 1}
                </span>
              </div>
              <p className="text-[10px] text-[#6B6B6B] truncate mt-0.5 px-0.5">{slide.title}</p>
            </button>
          ))}
        </div>

        {/* Slide content */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <div className="flex-1 relative overflow-hidden">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={current}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={slideTransition}
                className="absolute inset-0"
              >
                <CurrentSlide />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Presenter notes */}
          <div className="shrink-0 h-[90px] bg-[#FAFAF8] border-t border-[#E5E5E5] px-4 py-2.5 overflow-y-auto">
            <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-1">
              Presenter notes
            </p>
            <p className="text-xs text-[#6B6B6B] leading-relaxed">{slides[current].notes}</p>
          </div>

          {/* Bottom navigation */}
          <div className="shrink-0 flex items-center justify-end px-4 py-2 border-t border-[#E5E5E5] bg-white gap-2">
            <button
              onClick={goPrev}
              disabled={current === 0}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border border-[#D1D1D1] hover:bg-[#F5F3EF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="text-sm text-[#6B6B6B] min-w-[3ch] text-center">
              {current + 1} / {slides.length}
            </span>
            <button
              onClick={goNext}
              disabled={current === slides.length - 1}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-md bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
