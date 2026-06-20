import { AnimatePresence } from "framer-motion";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";
import { MarketingShell } from "@/features/marketing/components/MarketingShell";
import WindowComponent from "./Window";

function AppContent({ route }: { route: string }) {
  return (
    <div className="p-6">
      <MarketingShell route={route} />
    </div>
  );
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
              <AppContent route={w.route} />
            </WindowComponent>
          ))}
      </AnimatePresence>
    </div>
  );
}
