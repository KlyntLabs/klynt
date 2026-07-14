import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon, type IconType } from "@astryxdesign/core/Icon";
import { Section } from "@astryxdesign/core/Section";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { VStack } from "@astryxdesign/core/VStack";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Briefcase, Calendar, Construction, FileText, Globe, Users } from "lucide-react";
import { useState } from "react";
import { AboutTab } from "@/features/marketing/components/about/AboutTab";
import { useMarketingTranslation } from "@/features/marketing/lib/use-marketing-translation";
import styles from "./about-page.module.css";

/** framer-motion drives the Astryx stack directly — no raw motion.div. See Window.tsx. */
const MotionVStack = motion.create(VStack);

/*
 * The map holds icon *components* (`IconType`), not elements: Astryx's Icon takes the component
 * and owns its geometry and colour. The old map held pre-rendered lucide elements that a CSS rule
 * (`.comingSoonIcon svg { width: 32px }`) then resized — the exact thing Icon's docs forbid
 * ("Don't resize icons with arbitrary pixel values; use the provided size props").
 */
const COMING_SOON_ICONS: Record<string, IconType> = {
  roadmap: Calendar,
  wip: Construction,
  changelog: Calendar,
  people: Users,
  teams: Users,
  handbook: BookOpen,
  blog: FileText,
  media: Globe,
  careers: Briefcase,
};

function ComingSoonPlaceholder({ tabId }: { tabId: string }) {
  const { t } = useMarketingTranslation();

  return (
    <MotionVStack
      paddingBlock={10}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <EmptyState
        headingLevel={2}
        title={t("about.comingSoon")}
        description="🚧"
        icon={<Icon icon={COMING_SOON_ICONS[tabId] ?? Construction} size="lg" color="disabled" />}
      />
    </MotionVStack>
  );
}

export default function AboutPage() {
  const { t } = useMarketingTranslation();
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
    <Section variant="section" padding={0} height="100%" className={styles.page}>
      {/* Astryx models tabs as TabList + Tab. There is no TabsContent — the panel is just
          rendered conditionally, which is what the AnimatePresence swap already did. */}
      <HStack width="100%" className={styles.tabBar}>
        <TabList value={activeTab} onChange={setActiveTab} hasDivider>
          {tabs.map((tab) => (
            <Tab key={tab.id} value={tab.id} label={tab.label} />
          ))}
        </TabList>
      </HStack>

      <AnimatePresence mode="wait">
        {activeTab === "about" ? (
          <AboutTab key="about" />
        ) : (
          <ComingSoonPlaceholder key={activeTab} tabId={activeTab} />
        )}
      </AnimatePresence>
    </Section>
  );
}
