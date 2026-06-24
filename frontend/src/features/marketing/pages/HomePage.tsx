import { marketingRegistry } from "@/features/desktop/apps";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";
import {
  ContentTabsSection,
  CustomerLogosSection,
  DataStackSection,
  HeroSection,
  PricingCardsSection,
} from "@/features/marketing/sections";

export default function HomePage() {
  const { openApp } = useDesktopStore();

  const handleOpenApp = (route: string) => {
    const app = marketingRegistry.apps.find((app) => app.manifest.route === route);
    if (!app) return;
    openApp("marketing", app.manifest.id, {
      width: app.manifest.defaultSize.width,
      height: app.manifest.defaultSize.height,
    });
  };

  return (
    <div className="min-w-0">
      <HeroSection onOpenApp={handleOpenApp} />
      <ContentTabsSection onOpenApp={handleOpenApp} />
      <CustomerLogosSection onOpenApp={handleOpenApp} />
      <DataStackSection />
      <PricingCardsSection onOpenApp={handleOpenApp} />

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
