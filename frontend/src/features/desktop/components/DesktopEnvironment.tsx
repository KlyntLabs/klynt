import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Spinner } from "@/components/ui/spinner";
import { useToastStore } from "@/core/notifications/toast-store";
import { getPresetById } from "@/features/desktop/backgrounds/presets";
import type { DesktopLayout } from "@/features/desktop/persistence/types";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { DesktopConfig } from "../factory/types";
import CookieBanner from "./CookieBanner";
import DesktopIcons from "./DesktopIcons";
import Menubar from "./Menubar";
import { MobileFallback } from "./MobileFallback";
import WindowManager from "./WindowManager";

interface DesktopEnvironmentProps {
  config: DesktopConfig;
}

export function DesktopEnvironment({ config }: DesktopEnvironmentProps) {
  const { windows, openApp } = useDesktopStore();
  const desktopWindows = windows[config.id] ?? [];
  const [backgroundPresetId, setBackgroundPresetId] = useState(config.background.presetId);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation("home");
  const addToast = useToastStore((state) => state.addToast);
  const isBelowLg = useMediaQuery("(max-width: 1023px)");
  const configRef = useRef(config);
  configRef.current = config;

  const background = getPresetById(backgroundPresetId);
  const isOsDesktop = !config.singleApp;

  useEffect(() => {
    if (isBelowLg && isOsDesktop) return;
    let cancelled = false;
    const { persistence, id, defaultApp } = configRef.current;

    async function load() {
      const result = await persistence.load(id);
      if (cancelled) return;

      if (!result.ok) {
        addToast({
          message: t("desktop.toast.layoutLoadError"),
          type: "error",
          duration: 5000,
        });
        setIsLoading(false);
        return;
      }

      if (result.layout) {
        setBackgroundPresetId(result.layout.backgroundPresetId);
        for (const window of result.layout.windows) {
          openApp(id, window.appId, {
            x: window.x,
            y: window.y,
            width: window.width,
            height: window.height,
            state: window.state,
          });
        }
      } else if (defaultApp) {
        openApp(id, defaultApp.id, {
          width: defaultApp.defaultSize.width,
          height: defaultApp.defaultSize.height,
        });
      }

      setIsLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [isBelowLg, isOsDesktop, openApp, t, addToast]);

  useEffect(() => {
    if (isLoading) return;
    if (isBelowLg && isOsDesktop) return;
    if (!configRef.current.persistence.canEdit()) return;

    const layout: DesktopLayout = {
      version: 1,
      backgroundPresetId,
      icons: [],
      windows: desktopWindows.map((window) => ({
        appId: window.appId,
        x: window.x,
        y: window.y,
        width: window.width,
        height: window.height,
        state: window.state,
      })),
    };

    configRef.current.persistence.save(config.id, layout).then((result) => {
      if (!result.ok) {
        addToast({
          message: t("desktop.toast.layoutSaveError"),
          type: "error",
          duration: 5000,
        });
      }
    });
  }, [
    isBelowLg,
    isOsDesktop,
    desktopWindows,
    backgroundPresetId,
    config.id,
    isLoading,
    t,
    addToast,
  ]);

  if (isBelowLg && isOsDesktop) {
    return <MobileFallback />;
  }

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

      {/* Persistence loading overlay */}
      {isLoading && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Spinner />
        </div>
      )}
    </div>
  );
}

export default function DesktopEnvironmentDefault({ config }: DesktopEnvironmentProps) {
  return <DesktopEnvironment config={config} />;
}
