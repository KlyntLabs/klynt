import { motion } from "framer-motion";
import {
  Bold,
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Italic,
  Minus,
  Search,
  Settings,
  Share2,
  Square,
  Type,
  Underline,
  X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { WindowState } from "@/features/desktop/store/use-desktop-store";
import { useDesktopStore } from "@/features/desktop/store/use-desktop-store";

interface WindowProps {
  window: WindowState;
  children?: ReactNode;
}

export default function WindowComponent({ window: w, children }: WindowProps) {
  const { focusWindow, closeWindow, minimizeWindow, maximizeWindow, restoreWindow } =
    useDesktopStore();
  const { t } = useTranslation("home");

  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { x: number; y: number } }) => {
      const currentX = w.position.x + info.offset.x;
      const currentY = w.position.y + info.offset.y;
      const clampedX = Math.max(0, Math.min(currentX, window.innerWidth - w.size.width));
      const clampedY = Math.max(36, Math.min(currentY, window.innerHeight - 40));
      useDesktopStore.getState().setWindowPosition(w.id, { x: clampedX, y: clampedY });
    },
    [w.id, w.position.x, w.position.y, w.size.width]
  );

  const handleFocus = useCallback(() => {
    if (!w.isActive) {
      focusWindow(w.id);
    }
  }, [w.id, w.isActive, focusWindow]);

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0, y: 20 }}
      animate={{
        scale: 1,
        opacity: 1,
        y: w.isMaximized ? 36 : w.position.y,
        x: w.isMaximized ? 0 : w.position.x,
      }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 30,
      }}
      drag={!w.isMaximized}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      onPointerDown={handleFocus}
      style={{
        position: "absolute",
        zIndex: w.zIndex,
        top: 0,
        left: 0,
        width: w.isMaximized ? "calc(100vw - 0px)" : w.size.width,
        height: w.isMaximized ? "calc(100vh - 36px)" : w.size.height,
      }}
      className="flex flex-col rounded-lg border border-[#D1D1D1] bg-white shadow-[0_8px_32px_rgba(0,0,0,0.15)] overflow-hidden select-none"
    >
      {/* Title Bar */}
      <div
        className="h-[38px] flex items-center px-3 gap-2 border-b border-[#E5E5E5] shrink-0"
        style={{
          background: "linear-gradient(to bottom, #F0EDE6, #E8E4DC)",
        }}
      >
        {/* Window Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => closeWindow(w.id)}
            aria-label={t("desktop.window.close")}
            className="w-3 h-3 rounded-full bg-[#FF5F57] hover:bg-[#FF453A] flex items-center justify-center transition-colors group"
            title={t("desktop.window.close")}
          >
            <X className="w-2 h-2 text-[#8B0000] opacity-0 group-hover:opacity-100" />
          </button>
          <button
            type="button"
            onClick={() => minimizeWindow(w.id)}
            aria-label={t("desktop.window.minimize")}
            className="w-3 h-3 rounded-full bg-[#FEBC2E] hover:bg-[#FFB224] flex items-center justify-center transition-colors group"
            title={t("desktop.window.minimize")}
          >
            <Minus className="w-2 h-2 text-[#8B6914] opacity-0 group-hover:opacity-100" />
          </button>
          <button
            type="button"
            onClick={() => (w.isMaximized ? restoreWindow(w.id) : maximizeWindow(w.id))}
            aria-label={w.isMaximized ? t("desktop.window.restore") : t("desktop.window.maximize")}
            className="w-3 h-3 rounded-full bg-[#28C840] hover:bg-[#24B439] flex items-center justify-center transition-colors group"
            title={w.isMaximized ? t("desktop.window.restore") : t("desktop.window.maximize")}
          >
            <Square className="w-2 h-2 text-[#0B5C1F] opacity-0 group-hover:opacity-100" />
          </button>
        </div>

        {/* Window Title */}
        <div className="flex-1 flex items-center justify-center gap-1.5 cursor-default">
          <FileText className="w-3.5 h-3.5 text-[#6B6B6B]" />
          <span className="text-[13px] font-medium text-[#1A1A1A] truncate max-w-[200px]">
            {w.title}
          </span>
          <ChevronDown className="w-3 h-3 text-[#6B6B6B]" />
        </div>

        {/* Spacer to balance controls */}
        <div className="w-[52px] shrink-0" />
      </div>

      {/* Toolbar */}
      <div
        className="h-[40px] flex items-center px-2 gap-1 border-b border-[#E5E5E5] shrink-0"
        style={{ background: "#F5F3EF" }}
      >
        {/* Left: Navigation + Formatting */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={t("desktop.window.toolbar.back")}
            className="h-7 w-8 flex items-center justify-center rounded hover:bg-[#EBE8E2] transition-colors border border-transparent hover:border-[#D1D1D1]"
          >
            <ChevronLeft className="w-4 h-4 text-[#6B6B6B]" />
          </button>
          <button
            type="button"
            aria-label={t("desktop.window.toolbar.forward")}
            className="h-7 w-8 flex items-center justify-center rounded hover:bg-[#EBE8E2] transition-colors border border-transparent hover:border-[#D1D1D1]"
          >
            <ChevronRight className="w-4 h-4 text-[#6B6B6B]" />
          </button>
          <div className="w-px h-5 bg-[#D1D1D1] mx-1" />
          <button
            type="button"
            className="h-7 px-2 flex items-center gap-0.5 rounded hover:bg-[#EBE8E2] transition-colors border border-transparent hover:border-[#D1D1D1] text-[12px] text-[#6B6B6B]"
          >
            {t("desktop.window.zoom")} <ChevronDown className="w-3 h-3" />
          </button>
          <div className="w-px h-5 bg-[#D1D1D1] mx-1" />
          <button
            type="button"
            aria-label={t("desktop.window.toolbar.bold")}
            className="h-7 w-8 flex items-center justify-center rounded hover:bg-[#EBE8E2] transition-colors border border-transparent hover:border-[#D1D1D1]"
          >
            <Bold className="w-3.5 h-3.5 text-[#6B6B6B]" />
          </button>
          <button
            type="button"
            aria-label={t("desktop.window.toolbar.italic")}
            className="h-7 w-8 flex items-center justify-center rounded hover:bg-[#EBE8E2] transition-colors border border-transparent hover:border-[#D1D1D1]"
          >
            <Italic className="w-3.5 h-3.5 text-[#6B6B6B]" />
          </button>
          <button
            type="button"
            aria-label={t("desktop.window.toolbar.underline")}
            className="h-7 w-8 flex items-center justify-center rounded hover:bg-[#EBE8E2] transition-colors border border-transparent hover:border-[#D1D1D1]"
          >
            <Underline className="w-3.5 h-3.5 text-[#6B6B6B]" />
          </button>
          <div className="w-px h-5 bg-[#D1D1D1] mx-1" />
          <button
            type="button"
            aria-label={t("desktop.window.toolbar.font")}
            className="h-7 px-2 flex items-center gap-0.5 rounded hover:bg-[#EBE8E2] transition-colors border border-transparent hover:border-[#D1D1D1] text-[12px] text-[#6B6B6B]"
          >
            <Type className="w-3.5 h-3.5" /> <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        <div className="flex-1" />

        {/* Right: Search, Bookmark, Settings, Share */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={t("desktop.window.toolbar.search")}
            className="h-7 w-8 flex items-center justify-center rounded hover:bg-[#EBE8E2] transition-colors border border-transparent hover:border-[#D1D1D1]"
          >
            <Search className="w-4 h-4 text-[#6B6B6B]" />
          </button>
          <button
            type="button"
            aria-label={t("desktop.window.toolbar.bookmark")}
            className="h-7 w-8 flex items-center justify-center rounded hover:bg-[#EBE8E2] transition-colors border border-transparent hover:border-[#D1D1D1]"
          >
            <Bookmark className="w-4 h-4 text-[#6B6B6B]" />
          </button>
          <button
            type="button"
            aria-label={t("desktop.window.toolbar.settings")}
            className="h-7 w-8 flex items-center justify-center rounded hover:bg-[#EBE8E2] transition-colors border border-transparent hover:border-[#D1D1D1]"
          >
            <Settings className="w-4 h-4 text-[#6B6B6B]" />
          </button>
          <button
            type="button"
            className="h-7 px-3 flex items-center gap-1 rounded bg-[#F76E18] hover:bg-[#E56310] text-white text-[12px] font-medium transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            {t("desktop.window.share")}
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-white min-h-0">
        {w.isMinimized ? (
          <div className="flex items-center justify-center h-full text-[#9CA3AF] text-sm">
            {t("desktop.window.minimized")}
          </div>
        ) : (
          <div className="w-full">{children}</div>
        )}
      </div>
    </motion.div>
  );
}
