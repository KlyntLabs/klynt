import { AnimatePresence } from "framer-motion";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";
import AboutPage from "@/features/marketing/pages/AboutPage";
import CommunityPage from "@/features/marketing/pages/CommunityPage";
import CustomersPage from "@/features/marketing/pages/CustomersPage";
import DocsPage from "@/features/marketing/pages/DocsPage";
import HomePage from "@/features/marketing/pages/HomePage";
import PricingPage from "@/features/marketing/pages/PricingPage";
import ProductsPage from "@/features/marketing/pages/ProductsPage";
import TalkToHumanPage from "@/features/marketing/pages/TalkToHumanPage";
import TrashPage from "@/features/marketing/pages/TrashPage";
import WindowComponent from "./Window";

function RouteContent({ route }: { route: string }) {
  switch (route) {
    case "/":
      return <HomePage />;
    case "/products":
    case "/product-analytics":
    case "/web-analytics":
    case "/session-replay":
    case "/feature-flags":
    case "/experiments":
    case "/surveys":
    case "/data-warehouse":
      return <ProductsPage />;
    case "/pricing":
      return <PricingPage />;
    case "/customers":
      return <CustomersPage />;
    case "/docs":
      return <DocsPage />;
    case "/about":
    case "/careers":
    case "/handbook":
    case "/merch":
      return <AboutPage />;
    case "/community":
    case "/changelog":
      return <CommunityPage />;
    case "/trash":
      return <TrashPage />;
    case "/talk-to-a-human":
      return <TalkToHumanPage />;
    case "/demo":
      return <HomePage />;
    default:
      return <HomePage />;
  }
}

export default function WindowManager() {
  const { windows } = useDesktopStore();

  return (
    <div className="absolute inset-0" style={{ top: 36 }}>
      <AnimatePresence>
        {windows
          .filter((w) => !w.isMinimized)
          .map((w) => (
            <WindowComponent key={w.id} window={w}>
              <div className="p-6">
                <RouteContent route={w.route} />
              </div>
            </WindowComponent>
          ))}
      </AnimatePresence>
    </div>
  );
}
