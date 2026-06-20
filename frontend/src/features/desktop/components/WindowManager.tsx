import { AnimatePresence } from "framer-motion";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { getAppByRoute, marketingRegistry } from "@/features/desktop/apps";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";
import WindowComponent from "./Window";

function AppContent({ route }: { route: string }) {
  const app = getAppByRoute(marketingRegistry, route);

  if (!app) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-[#9CA3AF]">
        Unknown app: {route}
      </div>
    );
  }

  const AppComponent = app.component;
  return (
    <Suspense fallback={<Spinner className="mx-auto my-12" />}>
      <div className="p-6">
        <AppComponent />
      </div>
    </Suspense>
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
