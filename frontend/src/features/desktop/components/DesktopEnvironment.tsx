import { useEffect } from "react";
import { marketingRegistry } from "@/features/desktop/apps";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";
import CookieBanner from "./CookieBanner";
import DesktopIcons from "./DesktopIcons";
import Menubar from "./Menubar";
import WindowManager from "./WindowManager";

export default function DesktopEnvironment() {
  const { windows, openWindow } = useDesktopStore();
  const defaultApp = marketingRegistry.defaultApp;

  useEffect(() => {
    if (windows.length === 0) {
      openWindow(defaultApp.manifest.route, defaultApp.manifest.title, {
        size: defaultApp.manifest.defaultSize,
      });
    }
  }, [windows.length, openWindow]);

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      {/* Wallpaper Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "#D8D2C8",
          backgroundImage: "url(/wallpaper-texture.png)",
          backgroundRepeat: "repeat",
          backgroundSize: "512px 512px",
        }}
      />

      {/* Decorative hedgehog garden */}
      <div className="absolute bottom-4 right-4 opacity-30 pointer-events-none z-0">
        <img src="/hedgehog-garden.png" alt="" className="w-[280px] h-auto" />
      </div>

      {/* Menubar */}
      <Menubar />

      {/* Desktop Icons */}
      <DesktopIcons />

      {/* Windows */}
      <WindowManager />

      {/* Cookie Banner */}
      <CookieBanner />
    </div>
  );
}
