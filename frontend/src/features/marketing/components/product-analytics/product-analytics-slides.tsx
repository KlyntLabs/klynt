import { Button } from "@astryxdesign/core/Button";
import {
  BarChart3,
  Check,
  Code2,
  FileCode,
  Globe,
  RefreshCw,
  Route,
  Shield,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";

export function SlideTitle() {
  const { t } = useTranslation("marketing");
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F76E18] to-[#FFB224] flex items-center justify-center mb-6 shadow-lg">
        <BarChart3 className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-4xl font-bold text-[#1A1A1A] tracking-tight">
        {t("productAnalytics.slides.title.title")}
      </h1>
      <p className="text-xl text-[#6B6B6B] mt-3">{t("productAnalytics.slides.title.subtitle")}</p>
      <p className="text-base text-[#9CA3AF] mt-2">{t("productAnalytics.slides.title.tagline")}</p>
      <p className="text-sm text-[#9CA3AF] mt-12 animate-pulse">
        {t("productAnalytics.slides.title.hint")}
      </p>
    </div>
  );
}

export function SlideTrack() {
  const { t } = useTranslation("marketing");
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

export function SlideFeatures() {
  const { t } = useTranslation("marketing");
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

export function SlideAutocapture() {
  const { t } = useTranslation("marketing");
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
          <span className="text-[#F76E18]">klynt</span>
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

export function SlidePrivacy() {
  const { t } = useTranslation("marketing");
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

export function SlidePricing() {
  const { t } = useTranslation("marketing");
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
      <Button variant="primary" label={t("productAnalytics.slides.pricing.cta")} className="mt-6" />
    </div>
  );
}

export function SlideIntegration() {
  const { t } = useTranslation("marketing");
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
        <span className="text-white">{"{ useKlynt }"}</span>{" "}
        <span className="text-[#C084FC]">from</span>{" "}
        <span className="text-[#FEBC2E]">&apos;@klynt/js/react&apos;</span>
        <br />
        <br />
        <span className="text-[#9CA3AF]">
          {t("productAnalytics.slides.integration.codeComment2")}
        </span>
        <br />
        <span className="text-[#C084FC]">const</span> <span className="text-[#60A5FA]">klynt</span>{" "}
        <span className="text-white">=</span> <span className="text-[#F76E18]">useKlynt</span>
        <span className="text-white">()</span>
      </div>
    </div>
  );
}

export function SlideCTA() {
  const { t } = useTranslation("marketing");
  return (
    <div className="flex flex-col items-center justify-center h-full px-8 text-center">
      <h2 className="text-3xl font-bold text-[#1A1A1A]">
        {t("productAnalytics.slides.cta.title")}
      </h2>
      <p className="text-base text-[#6B6B6B] mt-3">{t("productAnalytics.slides.cta.subtitle")}</p>
      <div className="flex gap-3 mt-8">
        <Button variant="primary" label={t("productAnalytics.slides.cta.primary")} />
        <Button variant="secondary" label={t("productAnalytics.slides.cta.secondary")} />
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
