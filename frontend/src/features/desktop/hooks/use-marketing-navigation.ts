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
  const { viewMode, openApp } = useDesktopStore();

  const goTo = useCallback(
    (route: string) => {
      if (viewMode === "desktop") {
        const app = marketingRegistry.apps.find((app) => app.route === route);
        if (!app) {
          return;
        }
        openApp("marketing", app.id, {
          width: app.defaultSize.width,
          height: app.defaultSize.height,
        });
      } else {
        navigate(route);
      }
    },
    [navigate, openApp, viewMode]
  );

  const goToHome = useCallback(() => {
    goTo(marketingRegistry.defaultApp.route);
  }, [goTo]);

  const goToPricing = useCallback(() => {
    goTo("/pricing");
  }, [goTo]);

  return { goTo, goToHome, goToPricing };
}
