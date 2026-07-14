import { Center } from "@astryxdesign/core/Center";
import { Spinner } from "@astryxdesign/core/Spinner";
import { useToast } from "@astryxdesign/core/Toast";
import { VStack } from "@astryxdesign/core/VStack";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
import styles from "./desktop-environment.module.css";
import Menubar from "./Menubar";
import { MobileFallback } from "./MobileFallback";
import { useDesktopBundle } from "./use-desktop-bundle";
import { useDesktopEnvironmentActions } from "./use-desktop-environment-actions";
import { useDesktopLayoutSave } from "./use-desktop-layout-save";
import WindowManager from "./WindowManager";

/**
 * The wallpaper texture's tile edge, and the hedgehog's on-screen width.
 *
 * Both are far past Astryx's spacing scale (which stops at 48px), so per the sizing contract —
 * `SizeValue`: "numbers are treated as pixels" — they belong on the component, not in CSS.
 * GARDEN_WIDTH rides on the wrapper's `width` prop; WALLPAPER_TILE_SIZE has no prop to ride on
 * (background-size is not a design-system concern), so it goes through `style`, which BaseProps
 * keeps for exactly this.
 */
const WALLPAPER_TILE_SIZE = 512;
const GARDEN_WIDTH = 280;

interface DesktopEnvironmentProps {
  config: DesktopConfig;
}

export function DesktopEnvironment({ config }: DesktopEnvironmentProps) {
  const { windows, openApp, resetDesktop } = useWindowManager();
  const desktopWindows = windows[config.id] ?? [];
  const [backgroundPresetId, setBackgroundPresetId] = useState(config.background.presetId);
  const [isLoading, setIsLoading] = useState(true);
  const { t } = useTranslation("home");
  const toast = useToast();
  const isBelowLg = useMediaQuery("(max-width: 1023px)");
  const configRef = useRef(config);
  configRef.current = config;

  const tenantSlug = config.context.tenantSlug ?? "";
  const {
    apps,
    etag,
    isLoading: isBundleLoading,
    error: bundleError,
    refetch,
  } = useDesktopBundle(tenantSlug);
  const layoutTreeLoadedRef = useRef(false);

  const background = getPresetById(backgroundPresetId);
  const isOsDesktop = !config.singleApp;

  const handleChangeBackground = useCallback(() => {
    const ids = backgroundPresets.map((preset) => preset.id);
    setBackgroundPresetId(ids[(ids.indexOf(backgroundPresetId) + 1) % ids.length]);
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
    selectedAppId,
    setSelectedAppId,
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
    toast({
      body: t("desktop.toast.layoutLoadError"),
      type: "error",
      isAutoHide: true,
      autoHideDuration: 5000,
    });
    setIsLoading(false);
  }, [toast, t]);

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
    useIconTreeStore.getState().setTree(config.id, []);
  }, [isBundleLoading, bundleError, config.id]);

  useEffect(() => {
    if (isBundleLoading) return;
    if (bundleError) return;
    if (!etag) return;

    const desktopId = config.id;
    const previousEtag = useIconTreeStore.getState().bundleEtags[desktopId];
    if (previousEtag && previousEtag !== etag) {
      resetDesktop(desktopId);
      useIconTreeStore.getState().setTree(desktopId, []);
      layoutTreeLoadedRef.current = false;
    }
    useIconTreeStore.getState().setBundleEtag(desktopId, etag);
  }, [isBundleLoading, bundleError, etag, resetDesktop, config.id]);

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

  useDesktopLayoutSave(
    config,
    desktopWindows,
    backgroundPresetId,
    isLoading,
    isBelowLg,
    isOsDesktop,
    handleReload
  );

  if (isBelowLg && isOsDesktop) {
    return <MobileFallback />;
  }

  return (
    <VStack
      className={styles.root}
      width="100vw"
      height="100vh"
      onContextMenu={handleBackgroundContextMenu}
      role="application"
      aria-label={t("desktop.navLabel")}
    >
      {/* Wallpaper Background — the tint and the repeat are tokens/keywords in the module; the
          image and the tile size are values, so both ride on the component. */}
      <VStack
        className={styles.wallpaper}
        style={{
          backgroundImage: background ? `url(${background.src})` : "url(/wallpaper-texture.webp)",
          backgroundSize: `${WALLPAPER_TILE_SIZE}px ${WALLPAPER_TILE_SIZE}px`,
        }}
      />

      {/* Decorative hedgehog garden. The width is the wrapper's — a VStack prop, since 280px is
          far past Astryx's spacing scale — and the image just fills it. */}
      <VStack className={styles.garden} width={GARDEN_WIDTH}>
        <img
          src="/hedgehog-garden.webp"
          alt=""
          width={1024}
          height={1536}
          loading="lazy"
          decoding="async"
          className={styles.gardenImage}
        />
      </VStack>

      {/* Menubar */}
      <Menubar config={config} />

      {/* Desktop Icons */}
      <DesktopIcons
        config={config}
        apps={apps}
        onOpenContextMenu={handleOpenContextMenu}
        selectedAppId={selectedAppId}
        onSelectAppId={setSelectedAppId}
      />

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
        <Center className={styles.loadingOverlay} role="status" aria-live="polite" aria-busy="true">
          <Spinner />
        </Center>
      )}
    </VStack>
  );
}

export default function DesktopEnvironmentDefault({ config }: DesktopEnvironmentProps) {
  return <DesktopEnvironment config={config} />;
}
