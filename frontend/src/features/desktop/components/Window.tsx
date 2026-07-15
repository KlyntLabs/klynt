import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import { VStack } from "@astryxdesign/core/VStack";
import { motion } from "framer-motion";
import { ChevronDown, FileText } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { Suspense, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { tween } from "@/core/motion/astryx-motion";
import type { Window } from "@/features/desktop/window-manager/window-module";
import { MENUBAR_HEIGHT, useWindowManager } from "@/features/desktop/window-manager/window-module";
import { AppErrorBoundary } from "./AppErrorBoundary";
import styles from "./window.module.css";
import { WindowControls } from "./window-controls";
import { WindowToolbar } from "./window-toolbar";

/*
 * The window frame is an Astryx Card that framer-motion animates.
 *
 * Astryx has no window primitive, but it does not need one: a window is a *surface* (border,
 * elevation, radius, background — that is Card) with *behaviour* attached (drag, z-order,
 * absolute position — that is framer-motion). Every Astryx component extends BaseProps, which
 * deliberately keeps `ref`, `style`, `className` and event handlers, so `motion.create()` can
 * drive one directly. Composing them is the native path; reaching for a raw motion.div is not.
 */
const MotionCard = motion.create(Card);

/** Title-bar height. Astryx's spacing scale stops at 48px and has no dimension token; its own
 *  size props take plain pixel numbers (`SizeValue`: "numbers are treated as pixels"). */
const TITLE_BAR_HEIGHT = 38;

/** Balances the traffic lights so the title stays optically centred. */
const CONTROLS_SPACER_WIDTH = 52;

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
      const clampedY = Math.max(
        MENUBAR_HEIGHT,
        Math.min(currentY, window.innerHeight - TITLE_BAR_HEIGHT - 2)
      );
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
    <MotionCard
      padding={0}
      className={styles.window}
      initial={{ scale: 0.9, opacity: 0, y: 20 }}
      animate={{
        scale: 1,
        opacity: 1,
        y: isMaximized ? MENUBAR_HEIGHT : w.y,
        x: isMaximized ? 0 : w.x,
      }}
      exit={{ scale: 0.95, opacity: 0 }}
      // Astryx's motion model is tween-only (duration + easing), so the window open/settle is a
      // token-driven tween, not a spring. Losing the springy overshoot is the cost of using only
      // what the design system ships.
      transition={tween("fast")}
      drag={!isMaximized && !isLocked}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      onPointerDown={handleFocus}
      style={{
        position: "absolute",
        zIndex: w.zIndex,
        top: 0,
        left: 0,
        width: isMaximized ? "100vw" : w.width,
        height: isMaximized ? `calc(100vh - ${MENUBAR_HEIGHT}px)` : w.height,
      }}
      data-testid="desktop-window"
    >
      <HStack
        className={styles.titleBar}
        height={TITLE_BAR_HEIGHT}
        gap={2}
        align="center"
        paddingInline={3}
      >
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
         * .titleArea carries `flex: 1; min-width: 0` — see window.module.css. Those are structural
         * flex properties, not token values, and Astryx exposes no prop for either. The min-width
         * is load-bearing: without it a long title refuses to shrink and pushes past the frame.
         */}
        <HStack className={styles.titleArea} gap={1.5} align="center" justify="center">
          <Icon icon={FileText} size="xsm" color="secondary" />
          <Text type="label" maxLines={1}>
            {title}
          </Text>
          <Icon icon={ChevronDown} size="xsm" color="secondary" />
        </HStack>

        {!isLocked && <HStack width={CONTROLS_SPACER_WIDTH} />}
      </HStack>

      {!isLocked && <WindowToolbar />}

      <VStack className={styles.content} isScrollable>
        <Suspense
          fallback={
            <HStack justify="center" paddingBlock={10}>
              <Spinner />
            </HStack>
          }
        >
          <AppErrorBoundary
            fallback={ErrorFallback ?? DefaultErrorFallback}
            retryLimit={retryLimit}
          >
            {children}
          </AppErrorBoundary>
        </Suspense>
      </VStack>
    </MotionCard>
  );
}
