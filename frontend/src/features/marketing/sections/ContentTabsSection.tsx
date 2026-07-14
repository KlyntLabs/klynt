import { Section } from "@astryxdesign/core/Section";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TabDataPanel, TabDebugPanel, TabShipPanel, TabUnderstandPanel } from "./ContentTabsPanels";

interface ContentTabsSectionProps {
  onOpenApp: (route: string, title?: string) => void;
}

const panelMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

export function ContentTabsSection({ onOpenApp }: ContentTabsSectionProps) {
  const { t } = useTranslation("marketing");
  const [activeTab, setActiveTab] = useState("understand");

  const tabs = [
    { value: "understand", label: t("home.tabs.understand") },
    { value: "data", label: t("home.tabs.data") },
    { value: "debug", label: t("home.tabs.debug") },
    { value: "ship", label: t("home.tabs.ship") },
  ];

  return (
    <Section variant="transparent" padding={0}>
      {/*
       * Astryx models a tab strip as TabList + Tab, which owns the selected indicator. The old
       * markup painted a different accent under each tab from a hardcoded hex; Astryx draws the
       * indicator from the theme accent, so the per-tab colours are gone by design.
       */}
      <TabList value={activeTab} onChange={setActiveTab} layout="fill" hasDivider>
        {tabs.map((tab) => (
          <Tab key={tab.value} value={tab.value} label={tab.label} />
        ))}
      </TabList>

      <Section variant="section" padding={6}>
        <AnimatePresence mode="wait">
          {activeTab === "understand" && (
            <motion.div key="understand" {...panelMotion}>
              <TabUnderstandPanel onOpenApp={onOpenApp} />
            </motion.div>
          )}

          {activeTab === "data" && (
            <motion.div key="data" {...panelMotion}>
              <TabDataPanel onOpenApp={onOpenApp} />
            </motion.div>
          )}

          {activeTab === "debug" && (
            <motion.div key="debug" {...panelMotion}>
              <TabDebugPanel onOpenApp={onOpenApp} />
            </motion.div>
          )}

          {activeTab === "ship" && (
            <motion.div key="ship" {...panelMotion}>
              <TabShipPanel onOpenApp={onOpenApp} />
            </motion.div>
          )}
        </AnimatePresence>
      </Section>
    </Section>
  );
}
