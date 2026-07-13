import { Minus, Square, X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface WindowControlsProps {
  isMaximized: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
}

/**
 * macOS-style traffic lights.
 *
 * DELIBERATE ASTRYX EXCEPTION — raw hex, no tokens. These three colours are not brand or
 * semantic values that should follow a theme; they are literal quotations of the macOS
 * window controls, and the whole desktop metaphor depends on the user recognising them.
 * Mapping them onto Astryx's status tokens would make them theme-dependent and, in a dark
 * theme, no longer red/amber/green. Astryx has no window-control component to replace them.
 *
 * See docs/adr/015-astryx-component-layer.md — the desktop chrome is a bounded exception
 * to the "tokens for every value" rule, and this is one of the two places it applies.
 */
export function WindowControls({
  isMaximized,
  onClose,
  onMinimize,
  onToggleMaximize,
}: WindowControlsProps) {
  const { t } = useTranslation("home");

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={onClose}
        aria-label={t("desktop.window.close")}
        title={t("desktop.window.close")}
        className="group flex h-3 w-3 items-center justify-center rounded-full bg-[#FF5F57] transition-colors hover:bg-[#FF453A]"
      >
        <X className="h-2 w-2 text-[#8B0000] opacity-0 group-hover:opacity-100" />
      </button>
      <button
        type="button"
        onClick={onMinimize}
        aria-label={t("desktop.window.minimize")}
        title={t("desktop.window.minimize")}
        className="group flex h-3 w-3 items-center justify-center rounded-full bg-[#FEBC2E] transition-colors hover:bg-[#FFB224]"
      >
        <Minus className="h-2 w-2 text-[#8B6914] opacity-0 group-hover:opacity-100" />
      </button>
      <button
        type="button"
        onClick={onToggleMaximize}
        aria-label={isMaximized ? t("desktop.window.restore") : t("desktop.window.maximize")}
        title={isMaximized ? t("desktop.window.restore") : t("desktop.window.maximize")}
        className="group flex h-3 w-3 items-center justify-center rounded-full bg-[#28C840] transition-colors hover:bg-[#24B439]"
      >
        <Square className="h-2 w-2 text-[#0B5C1F] opacity-0 group-hover:opacity-100" />
      </button>
    </div>
  );
}
