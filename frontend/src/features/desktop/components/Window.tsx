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
    // toolbar, text, spinner, error state — but the frame is ours.
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
      className="flex select-none flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-[0_8px_32px_rgba(0,0,0,0.15)]"
      data-testid="desktop-window"
    >
      {/* Title bar */}
      <div className="flex h-[38px] shrink-0 items-center gap-2 border-border border-b bg-muted px-3">
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

        <div className="flex flex-1 cursor-default items-center justify-center gap-1.5">
          <FileText className="h-3.5 w-3.5" />
          <Text type="label" maxLines={1}>
            {title}
          </Text>
          <ChevronDown className="h-3 w-3" />
        </div>

        {/* Balances the traffic lights so the title stays optically centred */}
        {!isLocked && <div className="w-[52px] shrink-0" />}
      </div>

      {!isLocked && <WindowToolbar />}

      <div className="min-h-0 flex-1 overflow-y-auto bg-surface">
        <Suspense
          fallback={
            <div className="flex justify-center py-12">
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
