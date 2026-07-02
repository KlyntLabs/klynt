import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Spinner } from "@/components/ui/spinner";
import { useToastStore } from "@/core/notifications/toast-store";
import { backgroundPresets, getPresetById } from "@/features/desktop/backgrounds/presets";
import { DesktopContextMenu } from "@/features/desktop/context-menu/DesktopContextMenu";
import { NewAppDialog } from "@/features/desktop/context-menu/new-app-dialog";
import { useIconTreeStore } from "@/features/desktop/desktop-manager/icon-tree-module";
import type { DesktopLayout } from "@/features/desktop/persistence/types";
import { useWindowManager } from "@/features/desktop/window-manager/window-module";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { DesktopConfig } from "../factory/types";
import CookieBanner from "./CookieBanner";
import DesktopIcons from "./DesktopIcons";
import Menubar from "./Menubar";
import { MobileFallback } from "./MobileFallback";
import { useDesktopBundle } from "./use-desktop-bundle";
import { useDesktopEnvironmentActions } from "./use-desktop-environment-actions";
import WindowManager from "./WindowManager";

interface DesktopEnvironmentProps {
  config: DesktopConfig;
}

export function DesktopEnvironment({ config }: DesktopEnvironmentProps) {
  const { windows, openApp, resetDesktop } = useWindowManager();
  const desktopWindows = windows[config.id] ?? [];
  const [backgroundPresetId, setBackgroundPresetId] = useState(config.background.presetId);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation("home");
  const addToast = useToastStore((state) => state.addToast);
  const isBelowLg = useMediaQuery("(max-width: 1023px)");
  const configRef = useRef(config);
  configRef.current = config;

  const tenantSlug = config.context.tenantSlug ?? "";
  const {
    apps,
    isLoading: isBundleLoading,
    error: bundleError,
    refetch,
  } = useDesktopBundle(tenantSlug);
  const iconTree = useIconTreeStore((s) => s.trees[config.id]);
  const layoutTreeLoadedRef = useRef(false);

  const background = getPresetById(backgroundPresetId);
  const isOsDesktop = !config.singleApp;

  const handleChangeBackground = useCallback(() => {
    const ids = backgroundPresets.map((preset) => preset.id);
    const currentIndex = ids.indexOf(backgroundPresetId);
    const nextIndex = (currentIndex + 1) % ids.length;
    setBackgroundPresetId(ids[nextIndex]);
  }, [backgroundPresetId]);

  const {
    menuState,
    closeMenu,
    newAppDialog,
    setNewAppDialog,
    actionContext,
    handleOpenContextMenu,
    handleBackgroundContextMenu,
    handleCreateAppFromDialog,
  } = useDesktopEnvironmentActions(config, apps, refetch, handleChangeBackground);

  const applyLayout = useCallback(
    (id: string, layout: DesktopLayout | null) => {
      resetDesktop(id);

      if (layout) {
        setBackgroundPresetId(layout.backgroundPresetId);
        useIconTreeStore.getState().setTree(id, layout.iconTree ?? []);
        layoutTreeLoadedRef.current = true;

        for (const window of layout.windows) {
          openApp(id, window.appId, {
            x: window.x,
            y: window.y,
            width: window.width,
            height: window.height,
            state: window.state,
          });
        }
      }
    },
    [openApp, resetDesktop]
  );

  const handleLoadError = useCallback(() => {
    addToast({
      message: t("desktop.toast.layoutLoadError"),
      type: "error",
      duration: 5000,
    });
    setIsLoading(false);
  }, [addToast, t]);

  const handleReload = useCallback(async () => {
    const { persistence, id } = configRef.current;
    const result = await persistence.load(id);

    if (!result.ok) {
      handleLoadError();
      return;
    }

    useIconTreeStore.getState().setTree(id, []);
    applyLayout(id, result.layout ?? null);
  }, [applyLayout, handleLoadError]);

  useEffect(() => {
    if (isBundleLoading) return;
    if (layoutTreeLoadedRef.current) return;
    if (bundleError) return;
    useIconTreeStore.getState().setTree(configRef.current.id, []);
  }, [isBundleLoading, bundleError]);

  useEffect(() => {
    if (isBelowLg && isOsDesktop) return;
    let cancelled = false;
    const { id, defaultApp } = configRef.current;

    async function load() {
      const result = await configRef.current.persistence.load(id);
      if (cancelled) return;

      if (!result.ok) {
        handleLoadError();
        return;
      }

      applyLayout(id, result.layout ?? null);

      if (!result.layout && defaultApp) {
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
  }, [isBelowLg, isOsDesktop, openApp, applyLayout, handleLoadError]);

  useEffect(() => {
    if (isLoading) return;
    if (isBelowLg && isOsDesktop) return;
    if (!configRef.current.persistence.canEdit()) return;

    const layout: DesktopLayout = {
      version: 1,
      backgroundPresetId,
      iconTree: iconTree ?? [],
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
        if (result.error === "conflict") {
          addToast({
            message: t("desktop.toast.layoutSaveError"),
            type: "error",
            duration: 10000,
            action: {
              label: t("desktop.conflict.reload"),
              onClick: handleReload,
            },
          });
          return;
        }

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
    iconTree,
    t,
    addToast,
    handleReload,
  ]);

  if (isBelowLg && isOsDesktop) {
    return <MobileFallback />;
  }

  return (
    <div
      className="w-screen h-screen overflow-hidden relative"
      onContextMenu={handleBackgroundContextMenu}
      role="application"
      aria-label={t("desktop.navLabel")}
    >
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
      <DesktopIcons config={config} apps={apps} onOpenContextMenu={handleOpenContextMenu} />

      {/* Windows */}
      <WindowManager config={config} />

      {/* Cookie Banner */}
      <CookieBanner />

      {/* Context Menu */}
      <DesktopContextMenu state={menuState} actionContext={actionContext} onClose={closeMenu} />

      {/* New App Dialog */}
      <NewAppDialog
        open={newAppDialog.open}
        defaultType={newAppDialog.defaultType}
        onClose={() => setNewAppDialog({ open: false })}
        onCreate={handleCreateAppFromDialog}
      />

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
