import { Minus, Square, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import styles from "./window-controls.module.css";

interface WindowControlsProps {
  isMaximized: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
}

/**
 * macOS-style traffic lights.
 *
 * DELIBERATE ASTRYX EXCEPTION — the three colours live in window-controls.module.css as raw
 * hex, and they are the only hardcoded colour left in the desktop chrome. They are not brand
 * or semantic values that should follow a theme; they are literal quotations of the macOS
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
    <div className={styles.controls}>
      <button
        type="button"
        onClick={onClose}
        aria-label={t("desktop.window.close")}
        title={t("desktop.window.close")}
        className={`${styles.light} ${styles.close}`}
      >
        <X />
      </button>
      <button
        type="button"
        onClick={onMinimize}
        aria-label={t("desktop.window.minimize")}
        title={t("desktop.window.minimize")}
        className={`${styles.light} ${styles.minimize}`}
      >
        <Minus />
      </button>
      <button
        type="button"
        onClick={onToggleMaximize}
        aria-label={isMaximized ? t("desktop.window.restore") : t("desktop.window.maximize")}
        title={isMaximized ? t("desktop.window.restore") : t("desktop.window.maximize")}
        className={`${styles.light} ${styles.maximize}`}
      >
        <Square />
      </button>
    </div>
  );
}
