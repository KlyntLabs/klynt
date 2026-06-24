import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { marketingRegistry } from "@/features/desktop/apps";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";

export interface MarketingNavigation {
  /** Navigate to a marketing route, opening a window in desktop mode. */
  goTo: (route: string) => void;
  /** Open the home route. */
  goToHome: () => void;
  /** Open the pricing route. */
  goToPricing: () => void;
}

export function useMarketingNavigation(): MarketingNavigation {
  const navigate = useNavigate();
  const { viewMode, openWindow } = useDesktopStore();

  const goTo = useCallback(
    (route: string) => {
      if (viewMode === "desktop") {
        const app = marketingRegistry.apps.find((app) => app.manifest.route === route);
        if (!app) {
          return;
        }
        openWindow(app.manifest.route, app.manifest.title, {
          size: app.manifest.defaultSize,
        });
      } else {
        navigate(route);
      }
    },
    [navigate, openWindow, viewMode]
  );

  const goToHome = useCallback(() => {
    goTo(marketingRegistry.defaultApp.manifest.route);
  }, [goTo]);

  const goToPricing = useCallback(() => {
    goTo("/pricing");
  }, [goTo]);

  return { goTo, goToHome, goToPricing };
}
