import { Tab, TabList } from "@astryxdesign/core/TabList";
import { VStack } from "@astryxdesign/core/VStack";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Calendar,
  Construction,
  ExternalLink,
  FileText,
  Globe,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const COMING_SOON_ICONS: Record<string, React.ReactNode> = {
  roadmap: <Calendar className="w-8 h-8 text-[#9CA3AF]" />,
  wip: <Construction className="w-8 h-8 text-[#9CA3AF]" />,
  changelog: <Calendar className="w-8 h-8 text-[#9CA3AF]" />,
  people: <Users className="w-8 h-8 text-[#9CA3AF]" />,
  teams: <Users className="w-8 h-8 text-[#9CA3AF]" />,
  handbook: <BookOpen className="w-8 h-8 text-[#9CA3AF]" />,
  blog: <FileText className="w-8 h-8 text-[#9CA3AF]" />,
  media: <Globe className="w-8 h-8 text-[#9CA3AF]" />,
  careers: <Briefcase className="w-8 h-8 text-[#9CA3AF]" />,
};

function ComingSoonPlaceholder({ tabId }: { tabId: string }) {
  const { t } = useTranslation("marketing");
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="mb-4">
        {COMING_SOON_ICONS[tabId] || <Construction className="w-8 h-8 text-[#9CA3AF]" />}
      </div>
      <p className="text-[#9CA3AF] text-sm">{t("about.comingSoon")}</p>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-lg">🚧</span>
      </div>
    </motion.div>
  );
}

function AboutTab() {
  const { t } = useTranslation("marketing");
  const timeline = t("about.timeline", { returnObjects: true }) as {
    year: string;
    title: string;
    description: string;
  }[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <VStack height="100%" isScrollable className="h-full">
        <div className="p-6 md:p-8">
          {/* Founder header */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
            <div>
              <p className="text-xs text-[#9CA3AF] uppercase tracking-wider mb-1">
                {t("about.aboutTab.fromTheDesk")}
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#E5E5E5] flex items-center justify-center text-sm font-semibold text-[#6B6B6B]">
                  {t("about.aboutTab.initials")}
                </div>
                <div>
                  <p className="text-lg font-semibold text-[#1A1A1A]">{t("about.aboutTab.name")}</p>
                  <p className="text-sm text-[#6B6B6B]">{t("about.aboutTab.role")}</p>
                </div>
              </div>
            </div>
            <a
              href="https://x.com/james406"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#2563EB] hover:underline inline-flex items-center gap-1"
            >
              {t("about.aboutTab.social")} <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Main content - two column on larger screens */}
          <div className="flex flex-col md:flex-row gap-8">
            {/* Left: Letter content */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[#1A1A1A] leading-tight mb-6">
                {t("about.aboutTab.title")}
              </h1>

              <p className="text-base text-[#1A1A1A] font-medium mb-4">
                {t("about.aboutTab.subtitle")}
              </p>

              <p className="text-base text-[#6B6B6B] leading-relaxed mb-4">
                {t("about.aboutTab.body1")}
              </p>

              <p className="text-base text-[#1A1A1A] font-medium mb-6">
                {t("about.aboutTab.body2")}
              </p>

              <a
                href="/products"
                className="inline-flex items-center gap-1 bg-[#F76E18] text-white font-medium px-4 py-2 rounded-md hover:bg-[#E56310] transition-colors text-sm mb-8"
              >
                {t("about.aboutTab.cta")} <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Right: Hedgehog illustration */}
            <div className="flex flex-col items-center md:w-[240px] shrink-0">
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <img
                  src="/hedgehog-hero.webp"
                  alt={t("about.aboutTab.mascotAlt")}
                  width={1024}
                  height={1024}
                  loading="lazy"
                  decoding="async"
                  className="w-full max-w-[200px] md:max-w-[240px]"
                />
              </motion.div>
              <p className="text-sm text-[#9CA3AF] italic text-center mt-2">
                {t("about.aboutTab.caption")}
              </p>
            </div>
          </div>

          {/* Company story section */}
          <div className="mt-12 pt-8 border-t border-[#E5E5E5]">
            <h2 className="text-2xl font-bold text-[#1A1A1A] mb-6">
              {t("about.aboutTab.storyTitle")}
            </h2>

            {/* Timeline */}
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[15px] top-0 bottom-0 w-[2px] bg-[#E5E5E5]" />

              <div className="space-y-6">
                {timeline.map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.08 }}
                    className="relative flex gap-4"
                  >
                    {/* Dot */}
                    <div className="w-[32px] h-[32px] rounded-full bg-[#F76E18] flex items-center justify-center shrink-0 z-10">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                    <div className="flex-1 pt-1">
                      <span className="inline-block bg-[#F5F3EF] text-xs font-medium px-2 py-1 rounded mb-1">
                        {item.year}
                      </span>
                      <h3 className="text-base font-semibold text-[#1A1A1A]">{item.title}</h3>
                      <p className="text-sm text-[#6B6B6B] mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Stats callout */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="mt-8 bg-[#F5F3EF] rounded-lg p-6 text-center"
            >
              <p className="text-4xl font-bold text-[#F76E18]">{t("about.aboutTab.teamCount")}+</p>
              <p className="text-sm text-[#6B6B6B] mt-1">{t("about.aboutTab.teamCountLabel")}</p>
            </motion.div>
          </div>
        </div>
      </VStack>
    </motion.div>
  );
}

export default function AboutPage() {
  const { t } = useTranslation("marketing");
  const [activeTab, setActiveTab] = useState("about");

  const tabs = [
    { id: "about", label: t("about.tabs.about") },
    { id: "roadmap", label: t("about.tabs.roadmap") },
    { id: "wip", label: t("about.tabs.wip") },
    { id: "changelog", label: t("about.tabs.changelog") },
    { id: "people", label: t("about.tabs.people") },
    { id: "teams", label: t("about.tabs.teams") },
    { id: "handbook", label: t("about.tabs.handbook") },
    { id: "blog", label: t("about.tabs.blog") },
    { id: "media", label: t("about.tabs.media") },
    { id: "careers", label: t("about.tabs.careers") },
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Sub-navigation tabs */}
      <div className="shrink-0 border-b border-[#E5E5E5] bg-[#F5F3EF] overflow-x-auto">
        {/* Astryx models tabs as TabList + Tab. There is no TabsContent — the panel is just
            rendered conditionally, which is what the AnimatePresence swap already did. */}
        <TabList value={activeTab} onChange={setActiveTab} hasDivider>
          {tabs.map((tab) => (
            <Tab key={tab.id} value={tab.id} label={tab.label} />
          ))}
        </TabList>

        <AnimatePresence mode="wait">
          {activeTab === "about" ? (
            <AboutTab key="about" />
          ) : (
            <ComingSoonPlaceholder key={activeTab} tabId={activeTab} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
