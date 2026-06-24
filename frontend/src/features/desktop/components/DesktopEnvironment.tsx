import { useEffect } from "react";
import { getPresetById } from "@/features/desktop/backgrounds/presets";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";
import type { DesktopConfig } from "../factory/types";
import CookieBanner from "./CookieBanner";
import DesktopIcons from "./DesktopIcons";
import Menubar from "./Menubar";
import WindowManager from "./WindowManager";

interface DesktopEnvironmentProps {
  config: DesktopConfig;
}

export function DesktopEnvironment({ config }: DesktopEnvironmentProps) {
  const { windows, openApp } = useDesktopStore();
  const desktopWindows = windows[config.id] ?? [];
  const defaultApp = config.defaultApp;
  const background = getPresetById(config.background.presetId);

  useEffect(() => {
    if (defaultApp && desktopWindows.length === 0) {
      openApp(config.id, defaultApp.id, {
        width: defaultApp.defaultSize.width,
        height: defaultApp.defaultSize.height,
      });
    }
  }, [config.id, defaultApp, desktopWindows.length, openApp]);

  return (
    <div className="w-screen h-screen overflow-hidden relative">
      {/* Wallpaper Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "#D8D2C8",
          backgroundImage: background ? `url(${background.src})` : "url(/wallpaper-texture.webp)",
          backgroundRepeat: "repeat",
          backgroundSize: "512px 512px",
        }}
      />

      {/* Decorative hedgehog garden */}
      <div className="absolute bottom-4 right-4 opacity-30 pointer-events-none z-0">
        <img
          src="/hedgehog-garden.webp"
          alt=""
          width={1024}
          height={1536}
          loading="lazy"
          decoding="async"
          className="w-[280px] h-auto"
        />
      </div>

      {/* Menubar */}
      <Menubar config={config} />

      {/* Desktop Icons */}
      <DesktopIcons config={config} />

      {/* Windows */}
      <WindowManager config={config} />

      {/* Cookie Banner */}
      <CookieBanner />
    </div>
  );
}

export default function DesktopEnvironmentDefault({ config }: DesktopEnvironmentProps) {
  return <DesktopEnvironment config={config} />;
}
