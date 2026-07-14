import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import { motion } from "framer-motion";
import { ChevronDown, FileText } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { Suspense, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { Window } from "@/features/desktop/window-manager/window-module";
import { useWindowManager } from "@/features/desktop/window-manager/window-module";
import { AppErrorBoundary } from "./AppErrorBoundary";
import styles from "./window.module.css";
import { WindowControls } from "./window-controls";
import { WindowToolbar } from "./window-toolbar";

type ErrorFallbackProps = { error: Error; retry: () => void };

interface WindowProps {
  desktopId: string;
  window: Window;
  title: string;
  children?: ReactNode;
  errorFallback?: ComponentType<ErrorFallbackProps>;
  retryLimit?: number;
  locked?: boolean;
  singleApp?: boolean;
}

function DefaultErrorFallback({ error: _error, retry }: ErrorFallbackProps) {
  const { t } = useTranslation("home");
  return (
    <EmptyState
      title={t("desktop.errorFallback.title")}
      description={t("desktop.errorFallback.description")}
      actions={
        <Button variant="primary" label={t("desktop.errorFallback.retry")} onClick={retry} />
      }
    />
  );
}

export default function WindowComponent({
  desktopId,
  window: w,
  title,
  children,
  errorFallback: ErrorFallback,
  retryLimit,
  locked = false,
  singleApp = false,
}: WindowProps) {
  const {
    focusWindow,
    closeWindow,
    minimizeWindow,
    maximizeWindow,
    restoreWindow,
    moveWindow,
    activeWindowId,
  } = useWindowManager();
  const isActive = activeWindowId[desktopId] === w.id;
  const isMaximized = w.state === "maximized";
  const isLocked = locked || singleApp;

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number; y: number } }) => {
      const currentX = w.x + info.offset.x;
      const currentY = w.y + info.offset.y;
      const clampedX = Math.max(0, Math.min(currentX, window.innerWidth - w.width));
      const clampedY = Math.max(36, Math.min(currentY, window.innerHeight - 40));
      moveWindow(desktopId, w.id, { x: clampedX, y: clampedY, width: w.width, height: w.height });
    },
    [desktopId, w.id, w.x, w.y, w.width, w.height, moveWindow]
  );

  const handleFocus = useCallback(() => {
    if (!isActive) {
      focusWindow(desktopId, w.id);
    }
  }, [desktopId, w.id, isActive, focusWindow]);

  return (
    // DELIBERATE ASTRYX EXCEPTION — this frame stays a motion.div.
    //
    // Astryx has no window primitive: nothing in it expresses an absolutely-positioned,
    // draggable, z-ordered surface, and its layout components (AppShell/Layout) exist to own
    // page structure, which is the opposite of what a window manager needs. Forcing AppShell
    // here would fight the metaphor, not express it. The window's *contents* are Astryx —
    // toolbar, text, spinner, error state — but the frame is ours, styled from
    // window.module.css with Astryx tokens.
    //
    // See docs/adr/015-astryx-component-layer.md.
    <motion.div
      initial={{ scale: 0.9, opacity: 0, y: 20 }}
      animate={{
        scale: 1,
        opacity: 1,
        y: isMaximized ? 36 : w.y,
        x: isMaximized ? 0 : w.x,
      }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      drag={!isMaximized && !isLocked}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      onPointerDown={handleFocus}
      style={{
        position: "absolute",
        zIndex: w.zIndex,
        top: 0,
        left: 0,
        width: isMaximized ? "calc(100vw - 0px)" : w.width,
        height: isMaximized ? "calc(100vh - 36px)" : w.height,
      }}
      className={styles.window}
      data-testid="desktop-window"
    >
      {/* Title bar */}
      <div className={styles.titleBar}>
        {!isLocked && (
          <WindowControls
            isMaximized={isMaximized}
            onClose={() => closeWindow(desktopId, w.id)}
            onMinimize={() => minimizeWindow(desktopId, w.id)}
            onToggleMaximize={() =>
              isMaximized ? restoreWindow(desktopId, w.id) : maximizeWindow(desktopId, w.id)
            }
          />
        )}

        {/*
         * .titleArea carries `min-width: 0; flex: 1` — see window.module.css. That min-width is
         * load-bearing for long titles; it is the same fix the Tailwind `min-w-0 flex-1` did.
         */}
        <div className={styles.titleArea}>
          <FileText className={styles.titleIcon} />
          <Text type="label" maxLines={1}>
            {title}
          </Text>
          <ChevronDown className={styles.titleChevron} />
        </div>

        {/* Balances the traffic lights so the title stays optically centred */}
        {!isLocked && <div className={styles.controlsSpacer} />}
      </div>

      {!isLocked && <WindowToolbar />}

      <div className={styles.content}>
        <Suspense
          fallback={
            <div className={styles.loading}>
              <Spinner />
            </div>
          }
        >
          <AppErrorBoundary
            fallback={ErrorFallback ?? DefaultErrorFallback}
            retryLimit={retryLimit}
          >
            {children}
          </AppErrorBoundary>
        </Suspense>
      </div>
    </motion.div>
  );
}
