import { Selector } from "@astryxdesign/core/Selector";
import { useTranslation } from "react-i18next";
import { type ThemeMode, useThemeStore } from "./theme-store";

const MODES: ThemeMode[] = ["light", "dark", "system"];

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { t } = useTranslation("ui");
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);

  return (
    <Selector
      size="sm"
      isLabelHidden
      label={t("theme.label")}
      value={mode}
      onChange={(value) => setMode(value as ThemeMode)}
      className={className}
      data-testid="theme-toggle"
      options={MODES.map((value) => ({
        value,
        label: t(`theme.${value}`),
      }))}
    />
  );
}
