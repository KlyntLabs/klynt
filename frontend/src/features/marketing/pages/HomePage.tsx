import { VStack } from "@astryxdesign/core/VStack";
import { marketingRegistry } from "@/features/desktop/apps";
import { useWindowManager } from "@/features/desktop/window-manager/window-module";
import {
  ContentTabsSection,
  CustomerLogosSection,
  DataStackSection,
  HeroSection,
  PricingCardsSection,
} from "@/features/marketing/sections";
import styles from "./home-page.module.css";

export default function HomePage() {
  const { openApp } = useWindowManager();

  const handleOpenApp = (route: string) => {
    const app = marketingRegistry.apps.find((app) => app.route === route);
    if (!app) return;
    openApp("marketing", app.id, {
      width: app.defaultSize.width,
      height: app.defaultSize.height,
    });
  };

  return (
    <VStack gap={0} className={styles.page}>
      <HeroSection onOpenApp={handleOpenApp} />
      <ContentTabsSection onOpenApp={handleOpenApp} />
      <CustomerLogosSection onOpenApp={handleOpenApp} />
      <DataStackSection />
      <PricingCardsSection onOpenApp={handleOpenApp} />
    </VStack>
  );
}
