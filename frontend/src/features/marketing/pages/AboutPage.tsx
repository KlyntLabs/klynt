import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Section } from "@astryxdesign/core/Section";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Briefcase, Calendar, Construction, FileText, Globe, Users } from "lucide-react";
import { useState } from "react";
import { AboutTab } from "@/features/marketing/components/about/AboutTab";
import { useMarketingTranslation } from "@/features/marketing/lib/use-marketing-translation";
import styles from "./about-page.module.css";

const COMING_SOON_ICONS: Record<string, React.ReactNode> = {
  roadmap: <Calendar />,
  wip: <Construction />,
  changelog: <Calendar />,
  people: <Users />,
  teams: <Users />,
  handbook: <BookOpen />,
  blog: <FileText />,
  media: <Globe />,
  careers: <Briefcase />,
};

function ComingSoonPlaceholder({ tabId }: { tabId: string }) {
  const { t } = useMarketingTranslation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className={styles.comingSoon}
    >
      <EmptyState
        headingLevel={2}
        title={t("about.comingSoon")}
        description="🚧"
        icon={
          <span className={styles.comingSoonIcon}>
            {COMING_SOON_ICONS[tabId] || <Construction />}
          </span>
        }
      />
    </motion.div>
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
      <div className={styles.tabBar}>
        <TabList value={activeTab} onChange={setActiveTab} hasDivider>
          {tabs.map((tab) => (
            <Tab key={tab.id} value={tab.id} label={tab.label} />
          ))}
        </TabList>
      </div>

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
