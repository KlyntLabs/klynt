import { AnimatePresence, motion } from "framer-motion";
import { FileText, Flag, Globe, Plug, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  tab1Products,
  tab3Products,
  tab4Automation,
  tab4FeatureDev,
  tab4Feedback,
} from "@/features/marketing/data/homeData";
import { getMarketingIcon } from "@/features/marketing/lib/icon-map";

interface ContentTabsSectionProps {
  onOpenApp: (route: string, title?: string) => void;
}

export function ContentTabsSection({ onOpenApp }: ContentTabsSectionProps) {
  const { t } = useTranslation("marketing");
  const tk = (key: string) => t(key as never);
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { label: t("home.tabs.understand"), accent: "#22C55E" },
    { label: t("home.tabs.data"), accent: "#22C55E" },
    { label: t("home.tabs.debug"), accent: "#F76E18" },
    { label: t("home.tabs.ship"), accent: "#2563EB" },
  ];

  const dataSources = t("data.dataSources", { returnObjects: true }) as unknown as string[];
  const dataManageQuery = t("data.dataManageQuery", { returnObjects: true }) as unknown as string[];
  const dataExport = t("data.dataExport", { returnObjects: true }) as unknown as string[];

  return (
    <section className="mb-8">
      {/* Tab Bar */}
      <div className="flex border border-[#D1D1D1] rounded-t-lg bg-[#F0EDE6] p-1 gap-1">
        {tabs.map((tab, idx) => (
          <button
            type="button"
            key={tab.label}
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
                  <h2 className="text-lg font-semibold mb-2">{t("home.tabUnderstand.title")}</h2>
                  <p className="text-sm text-[#6B6B6B] mb-3">{t("home.tabUnderstand.body")}</p>
                  <button
                    type="button"
                    onClick={() => onOpenApp("/products", t("home.tabUnderstand.title"))}
                    className="text-sm text-[#2563EB] hover:underline"
                  >
                    {t("home.tabUnderstand.link")}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {tab1Products.map((product) => (
                    <button
                      type="button"
                      key={product.id}
                      onClick={() => onOpenApp(product.route, tk(product.labelKey))}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-md hover:bg-[#F5F3EF] transition-colors"
                    >
                      {getMarketingIcon(product.icon, <Globe className="w-7 h-7 text-[#6B6B6B]" />)}
                      <span className="text-xs font-medium text-center text-[#1A1A1A]">
                        {tk(product.labelKey)}
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
              <h2 className="text-lg font-semibold mb-2">{t("home.tabData.title")}</h2>
              <p className="text-sm text-[#6B6B6B] mb-4">{t("home.tabData.body")}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2">{t("home.tabData.sourcesTitle")}</h3>
                  <div className="flex flex-wrap gap-1">
                    {dataSources.map((s) => (
                      <span key={s} className="bg-[#F5F3EF] text-xs px-2 py-1 rounded-md">
                        {s}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenApp("/products", t("home.tabData.sourcesTitle"))}
                    className="text-xs text-[#2563EB] hover:underline mt-2"
                  >
                    {t("home.tabData.sourcesLink")}
                  </button>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2">{t("home.tabData.manageTitle")}</h3>
                  <div className="flex flex-wrap gap-1">
                    {dataManageQuery.map((s) => (
                      <span key={s} className="bg-[#F5F3EF] text-xs px-2 py-1 rounded-md">
                        {s}
                      </span>
                    ))}
                  </div>
                  <button type="button" className="text-xs text-[#2563EB] hover:underline mt-2">
                    {t("home.tabData.manageLink")}
                  </button>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2">{t("home.tabData.exportTitle")}</h3>
                  <div className="flex flex-wrap gap-1">
                    {dataExport.map((s) => (
                      <span key={s} className="bg-[#F5F3EF] text-xs px-2 py-1 rounded-md">
                        {s}
                      </span>
                    ))}
                  </div>
                  <button type="button" className="text-xs text-[#2563EB] hover:underline mt-2">
                    {t("home.tabData.exportLink")}
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
              <h2 className="text-lg font-semibold mb-2">{t("home.tabDebug.title")}</h2>
              <p className="text-sm text-[#6B6B6B] mb-4">{t("home.tabDebug.body")}</p>
              <div className="grid grid-cols-2 gap-3">
                {tab3Products.map((product) => (
                  <button
                    type="button"
                    key={product.id}
                    onClick={() => onOpenApp(product.route, tk(product.labelKey))}
                    className="flex flex-col gap-2 p-4 border border-[#E5E5E5] rounded-md hover:shadow-sm hover:border-[#D1D1D1] transition-all text-left"
                  >
                    {getMarketingIcon(
                      product.icon,
                      <FileText className="w-8 h-8 text-[#6B6B6B]" />
                    )}
                    <span className="font-semibold text-sm">{tk(product.labelKey)}</span>
                    <span className="text-xs text-[#6B6B6B]">
                      {product.descriptionKey ? tk(product.descriptionKey) : ""}
                    </span>
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
              <h2 className="text-lg font-semibold mb-2">{t("home.tabShip.title")}</h2>
              <p className="text-sm text-[#6B6B6B] mb-2">{t("home.tabShip.body1")}</p>
              <p className="text-sm text-[#6B6B6B] mb-4">{t("home.tabShip.body2")}</p>
              <div className="space-y-4">
                <TabShipGroup
                  title={t("home.tabShip.featureDev")}
                  items={tab4FeatureDev}
                  onOpenApp={onOpenApp}
                  fallbackIcon={<Flag className="w-5 h-5 text-[#6B6B6B]" />}
                />
                <TabShipGroup
                  title={t("home.tabShip.automation")}
                  items={tab4Automation}
                  onOpenApp={onOpenApp}
                  fallbackIcon={<Plug className="w-5 h-5 text-[#6B6B6B]" />}
                />
                <TabShipGroup
                  title={t("home.tabShip.feedback")}
                  items={tab4Feedback}
                  onOpenApp={onOpenApp}
                  fallbackIcon={<Users className="w-5 h-5 text-[#6B6B6B]" />}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

interface TabShipGroupProps {
  title: string;
  items: Array<{ id: string; route: string; labelKey: string; icon: string }>;
  onOpenApp: (route: string, title?: string) => void;
  fallbackIcon: React.ReactNode;
}

function TabShipGroup({ title, items, onOpenApp, fallbackIcon }: TabShipGroupProps) {
  const { t } = useTranslation("marketing");
  const tk = (key: string) => t(key as never);

  return (
    <div>
      <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">{title}</p>
      <div className="space-y-1">
        {items.map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => onOpenApp(item.route, tk(item.labelKey))}
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[#F5F3EF] transition-colors w-full text-left"
          >
            {getMarketingIcon(item.icon, fallbackIcon)}
            <span className="text-sm font-medium">{tk(item.labelKey)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
