import { Section } from "@astryxdesign/core/Section";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { VStack } from "@astryxdesign/core/VStack";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TabDataPanel, TabDebugPanel, TabShipPanel, TabUnderstandPanel } from "./ContentTabsPanels";

interface ContentTabsSectionProps {
  onOpenApp: (route: string, title?: string) => void;
}

/** framer-motion drives the Astryx stack directly — no raw motion.div. See Window.tsx. */
const MotionVStack = motion.create(VStack);

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
            <MotionVStack key="understand" {...panelMotion}>
              <TabUnderstandPanel onOpenApp={onOpenApp} />
            </MotionVStack>
          )}

          {activeTab === "data" && (
            <MotionVStack key="data" {...panelMotion}>
              <TabDataPanel onOpenApp={onOpenApp} />
            </MotionVStack>
          )}

          {activeTab === "debug" && (
            <MotionVStack key="debug" {...panelMotion}>
              <TabDebugPanel onOpenApp={onOpenApp} />
            </MotionVStack>
          )}

          {activeTab === "ship" && (
            <MotionVStack key="ship" {...panelMotion}>
              <TabShipPanel onOpenApp={onOpenApp} />
            </MotionVStack>
          )}
        </AnimatePresence>
      </Section>
    </Section>
  );
}
