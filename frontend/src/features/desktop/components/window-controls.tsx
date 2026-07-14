import { HStack } from "@astryxdesign/core/HStack";
import { Icon } from "@astryxdesign/core/Icon";
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
 * No carve-out left. The three colours are Astryx's categorical icon tokens
 * (--color-icon-red / -yellow / -green) and the glyphs are Astryx `Icon`s sized with the
 * documented size prop ("Don't resize icons with arbitrary pixel values; use the provided
 * size props"), so nothing here is hand-valued. The reveal-on-hover is driven by `color`
 * inheritance on the button — Icon defaults to color="inherit" — rather than by an element
 * selector on the SVG. See window-controls.module.css.
 */
export function WindowControls({
  isMaximized,
  onClose,
  onMinimize,
  onToggleMaximize,
}: WindowControlsProps) {
  const { t } = useTranslation("home");

  return (
    <HStack className={styles.controls} gap={1.5} align="center">
      <button
        type="button"
        onClick={onClose}
        aria-label={t("desktop.window.close")}
        title={t("desktop.window.close")}
        className={`${styles.light} ${styles.close}`}
      >
        <Icon icon={X} size="xsm" />
      </button>
      <button
        type="button"
        onClick={onMinimize}
        aria-label={t("desktop.window.minimize")}
        title={t("desktop.window.minimize")}
        className={`${styles.light} ${styles.minimize}`}
      >
        <Icon icon={Minus} size="xsm" />
      </button>
      <button
        type="button"
        onClick={onToggleMaximize}
        aria-label={isMaximized ? t("desktop.window.restore") : t("desktop.window.maximize")}
        title={isMaximized ? t("desktop.window.restore") : t("desktop.window.maximize")}
        className={`${styles.light} ${styles.maximize}`}
      >
        <Icon icon={Square} size="xsm" />
      </button>
    </HStack>
  );
}
