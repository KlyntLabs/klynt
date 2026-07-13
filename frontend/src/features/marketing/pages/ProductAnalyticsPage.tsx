import { Button } from "@astryxdesign/core/Button";
import { Download, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  SlideAutocapture,
  SlideCTA,
  SlideFeatures,
  SlideIntegration,
  SlidePricing,
  SlidePrivacy,
  SlideTitle,
  SlideTrack,
} from "@/features/marketing/components/product-analytics";
import type { Slide } from "@/features/marketing/components/slide-deck";
import { SlideDeck } from "@/features/marketing/components/slide-deck";

export default function ProductAnalyticsPage() {
  const { t } = useTranslation("marketing");

  const slides: Slide[] = [
    {
      id: 1,
      title: t("productAnalytics.slides.slideTitles.title"),
      render: SlideTitle,
      notes: t("productAnalytics.slides.notes.title"),
    },
    {
      id: 2,
      title: t("productAnalytics.slides.slideTitles.track"),
      render: SlideTrack,
      notes: t("productAnalytics.slides.notes.track"),
    },
    {
      id: 3,
      title: t("productAnalytics.slides.slideTitles.features"),
      render: SlideFeatures,
      notes: t("productAnalytics.slides.notes.features"),
    },
    {
      id: 4,
      title: t("productAnalytics.slides.slideTitles.autocapture"),
      render: SlideAutocapture,
      notes: t("productAnalytics.slides.notes.autocapture"),
    },
    {
      id: 5,
      title: t("productAnalytics.slides.slideTitles.privacy"),
      render: SlidePrivacy,
      notes: t("productAnalytics.slides.notes.privacy"),
    },
    {
      id: 6,
      title: t("productAnalytics.slides.slideTitles.pricing"),
      render: SlidePricing,
      notes: t("productAnalytics.slides.notes.pricing"),
    },
    {
      id: 7,
      title: t("productAnalytics.slides.slideTitles.integration"),
      render: SlideIntegration,
      notes: t("productAnalytics.slides.notes.integration"),
    },
    {
      id: 8,
      title: t("productAnalytics.slides.slideTitles.cta"),
      render: SlideCTA,
      notes: t("productAnalytics.slides.notes.cta"),
    },
  ];

  const topBar = (
    <>
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
        variant="primary"
        size="sm"
        label={t("productAnalytics.toolbar.getStarted")}
        className="ml-1"
      />
    </>
  );

  return (
    <SlideDeck
      slides={slides}
      topBar={topBar}
      notesLabel={t("productAnalytics.navigation.notesLabel")}
      prevLabel={t("productAnalytics.navigation.prev")}
      nextLabel={t("productAnalytics.navigation.next")}
    />
  );
}
