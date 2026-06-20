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
import { useTranslation } from "react-i18next";
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
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export default function ProductAnalyticsPage() {
  const { t } = useTranslation("marketing");

  /* ── Slide content components ── */

  /* ── Slide 1: Title ── */
  function SlideTitle() {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F76E18] to-[#FFB224] flex items-center justify-center mb-6 shadow-lg">
          <BarChart3 className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-[#1A1A1A] tracking-tight">
          {t("productAnalytics.slides.title.title")}
        </h1>
        <p className="text-xl text-[#6B6B6B] mt-3">{t("productAnalytics.slides.title.subtitle")}</p>
        <p className="text-base text-[#9CA3AF] mt-2">
          {t("productAnalytics.slides.title.tagline")}
        </p>
        <p className="text-sm text-[#9CA3AF] mt-12 animate-pulse">
          {t("productAnalytics.slides.title.hint")}
        </p>
      </div>
    );
  }

  /* ── Slide 2: What You Can Track ── */
  function SlideTrack() {
    const items = t("productAnalytics.slides.track.items", { returnObjects: true }) as string[];
    return (
      <div className="flex items-center h-full px-8 gap-8">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">
            {t("productAnalytics.slides.track.title")}
          </h2>
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
    const features = t("productAnalytics.slides.features.items", { returnObjects: true }) as {
      title: string;
      desc: string;
    }[];
    return (
      <div className="flex flex-col items-center justify-center h-full px-8">
        <h2 className="text-2xl font-bold text-[#1A1A1A] mb-8">
          {t("productAnalytics.slides.features.title")}
        </h2>
        <div className="grid grid-cols-3 gap-4 w-full max-w-xl">
          {features.map(({ title, desc }, index) => {
            const icons = [TrendingUp, Target, RefreshCw, Route, Users, FileCode];
            const Icon = icons[index] ?? BarChart3;
            return (
              <div
                key={title}
                className="border border-[#E5E5E5] rounded-xl p-5 flex flex-col items-center text-center hover:border-[#F76E18]/30 hover:shadow-sm transition-all"
              >
                <Icon className="w-7 h-7 text-[#F76E18] mb-2" />
                <span className="text-sm font-semibold text-[#1A1A1A]">{title}</span>
                <span className="text-xs text-[#6B6B6B] mt-1">{desc}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── Slide 4: Autocapture ── */
  function SlideAutocapture() {
    const items = t("productAnalytics.slides.autocapture.items", {
      returnObjects: true,
    }) as string[];
    return (
      <div className="flex items-center h-full px-8 gap-8">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-4">
            {t("productAnalytics.slides.autocapture.title")}
          </h2>
          <p className="text-sm text-[#6B6B6B] mb-4">
            {t("productAnalytics.slides.autocapture.body")}
          </p>
          <ul className="space-y-2 text-sm text-[#1A1A1A]">
            {items.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                {item}
              </li>
            ))}
          </ul>
          <p className="text-sm text-[#6B6B6B] mt-4">
            {t("productAnalytics.slides.autocapture.footer")}
          </p>
        </div>
        <div className="flex-1">
          <div className="bg-[#1A1A1A] text-[#22C55E] font-mono text-sm p-5 rounded-xl shadow-lg">
            <span className="text-[#9CA3AF]">
              {t("productAnalytics.slides.autocapture.codeComment1")}
            </span>
            <br />
            <span className="text-[#F76E18]">posthog</span>
            <span className="text-white">.init(</span>
            <span className="text-[#FEBC2E]">&apos;YOUR_API_KEY&apos;</span>
            <span className="text-white">)</span>
            <br />
            <br />
            <span className="text-[#9CA3AF]">
              {t("productAnalytics.slides.autocapture.codeComment2")}
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* ── Slide 5: Privacy ── */
  function SlidePrivacy() {
    const pillars = t("productAnalytics.slides.privacy.items", { returnObjects: true }) as {
      title: string;
      desc: string;
    }[];
    return (
      <div className="flex flex-col items-center justify-center h-full px-8">
        <h2 className="text-2xl font-bold text-[#1A1A1A] mb-8">
          {t("productAnalytics.slides.privacy.title")}
        </h2>
        <div className="flex gap-6 w-full max-w-xl">
          {pillars.map(({ title, desc }, index) => {
            const icons = [Globe, Shield, Code2];
            const Icon = icons[index] ?? Globe;
            return (
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
            );
          })}
        </div>
      </div>
    );
  }

  /* ── Slide 6: Pricing ── */
  function SlidePricing() {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8">
        <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">
          {t("productAnalytics.slides.pricing.title")}
        </h2>
        <div className="border border-[#E5E5E5] rounded-2xl p-8 w-full max-w-xs text-center shadow-sm">
          <p className="text-base font-semibold text-[#1A1A1A]">
            {t("productAnalytics.slides.pricing.product")}
          </p>
          <p className="text-3xl font-bold text-[#22C55E] mt-3">
            {t("productAnalytics.slides.pricing.freeTier")}
          </p>
          <p className="text-sm text-[#22C55E] mt-1">
            {t("productAnalytics.slides.pricing.freeLabel")}
          </p>
          <div className="border-t border-[#E5E5E5] my-4" />
          <p className="text-sm text-[#6B6B6B]">{t("productAnalytics.slides.pricing.rate")}</p>
          <p className="text-xs text-[#9CA3AF] mt-1">
            {t("productAnalytics.slides.pricing.noHiddenFees")}
          </p>
        </div>
        <Button className="mt-6 bg-[#F76E18] hover:bg-[#E56310] text-white rounded-lg px-6">
          {t("productAnalytics.slides.pricing.cta")} <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    );
  }

  /* ── Slide 7: Integration ── */
  function SlideIntegration() {
    const frameworks = t("productAnalytics.slides.integration.frameworks", {
      returnObjects: true,
    }) as string[];
    return (
      <div className="flex flex-col items-center justify-center h-full px-8">
        <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">
          {t("productAnalytics.slides.integration.title")}
        </h2>
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
          <span className="text-[#9CA3AF]">
            {t("productAnalytics.slides.integration.codeComment1")}
          </span>
          <br />
          <span className="text-[#C084FC]">import</span>{" "}
          <span className="text-white">{"{ usePostHog }"}</span>{" "}
          <span className="text-[#C084FC]">from</span>{" "}
          <span className="text-[#FEBC2E]">&apos;posthog-js/react&apos;</span>
          <br />
          <br />
          <span className="text-[#9CA3AF]">
            {t("productAnalytics.slides.integration.codeComment2")}
          </span>
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
        <h2 className="text-3xl font-bold text-[#1A1A1A]">
          {t("productAnalytics.slides.cta.title")}
        </h2>
        <p className="text-base text-[#6B6B6B] mt-3">{t("productAnalytics.slides.cta.subtitle")}</p>
        <div className="flex gap-3 mt-8">
          <Button className="bg-[#F76E18] hover:bg-[#E56310] text-white rounded-lg px-5">
            {t("productAnalytics.slides.cta.primary")}
          </Button>
          <Button variant="outline" className="rounded-lg px-5 border-[#D1D1D1]">
            {t("productAnalytics.slides.cta.secondary")}
          </Button>
        </div>
        <div className="mt-6 bg-[#F5F3EF] font-mono text-sm px-4 py-2 rounded-lg flex items-center gap-2">
          <span>{t("productAnalytics.slides.cta.installCommand")}</span>
          <button
            type="button"
            className="text-[#9CA3AF] hover:text-[#1A1A1A] transition-colors"
            onClick={() =>
              navigator.clipboard?.writeText(t("productAnalytics.slides.cta.installCommand"))
            }
            title={t("productAnalytics.slides.cta.copyTooltip")}
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
              aria-label={t("productAnalytics.slides.cta.copyTooltip")}
            >
              <title>{t("productAnalytics.slides.cta.copyTooltip")}</title>
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  const slides: SlideData[] = [
    {
      id: 1,
      title: t("productAnalytics.slides.slideTitles.title"),
      bg: "bg-white",
      render: SlideTitle,
      notes: t("productAnalytics.slides.notes.title"),
    },
    {
      id: 2,
      title: t("productAnalytics.slides.slideTitles.track"),
      bg: "bg-white",
      render: SlideTrack,
      notes: t("productAnalytics.slides.notes.track"),
    },
    {
      id: 3,
      title: t("productAnalytics.slides.slideTitles.features"),
      bg: "bg-white",
      render: SlideFeatures,
      notes: t("productAnalytics.slides.notes.features"),
    },
    {
      id: 4,
      title: t("productAnalytics.slides.slideTitles.autocapture"),
      bg: "bg-white",
      render: SlideAutocapture,
      notes: t("productAnalytics.slides.notes.autocapture"),
    },
    {
      id: 5,
      title: t("productAnalytics.slides.slideTitles.privacy"),
      bg: "bg-white",
      render: SlidePrivacy,
      notes: t("productAnalytics.slides.notes.privacy"),
    },
    {
      id: 6,
      title: t("productAnalytics.slides.slideTitles.pricing"),
      bg: "bg-white",
      render: SlidePricing,
      notes: t("productAnalytics.slides.notes.pricing"),
    },
    {
      id: 7,
      title: t("productAnalytics.slides.slideTitles.integration"),
      bg: "bg-white",
      render: SlideIntegration,
      notes: t("productAnalytics.slides.notes.integration"),
    },
    {
      id: 8,
      title: t("productAnalytics.slides.slideTitles.cta"),
      bg: "bg-white",
      render: SlideCTA,
      notes: t("productAnalytics.slides.notes.cta"),
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
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs text-[#6B6B6B] hover:text-[#1A1A1A] px-3 py-1.5 rounded-md border border-[#D1D1D1] hover:bg-[#F5F3EF] transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          {t("productAnalytics.toolbar.exportPdf")}
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs text-white bg-[#1A1A1A] hover:bg-[#333] px-3 py-1.5 rounded-md transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
          {t("productAnalytics.toolbar.present")}
        </button>
        <Button
          size="sm"
          className="bg-[#F76E18] hover:bg-[#E56310] text-white text-xs rounded-md ml-1"
        >
          {t("productAnalytics.toolbar.getStarted")}
        </Button>
      </div>

      {/* Main area */}
      <div className="flex flex-1 min-h-0">
        {/* Slide thumbnails panel */}
        <div className="w-[180px] shrink-0 bg-[#F5F3EF] border-r border-[#E5E5E5] overflow-y-auto p-3">
          {slides.map((slide, idx) => (
            <button
              type="button"
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
                      {["Re", "Vu", "Py"].map((item) => (
                        <span key={item} className="text-[5px] px-0.5 bg-[#F5F3EF] rounded">
                          {item}
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
              {t("productAnalytics.navigation.notesLabel")}
            </p>
            <p className="text-xs text-[#6B6B6B] leading-relaxed">{slides[current].notes}</p>
          </div>

          {/* Bottom navigation */}
          <div className="shrink-0 flex items-center justify-end px-4 py-2 border-t border-[#E5E5E5] bg-white gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={current === 0}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border border-[#D1D1D1] hover:bg-[#F5F3EF] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" /> {t("productAnalytics.navigation.prev")}
            </button>
            <span className="text-sm text-[#6B6B6B] min-w-[3ch] text-center">
              {current + 1} / {slides.length}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={current === slides.length - 1}
              className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-md bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t("productAnalytics.navigation.next")} <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
