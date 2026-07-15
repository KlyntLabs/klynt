import { Selector } from "@astryxdesign/core/Selector";
import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "@/core/i18n/types";

const LANGUAGE_FLAGS: Record<(typeof SUPPORTED_LANGUAGES)[number], string> = {
  en: "🇬🇧",
  vi: "🇻🇳",
  cn: "🇨🇳",
};

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation("common");

  return (
    <Selector
      size="sm"
      isLabelHidden
      label={t("language.label")}
      value={i18n.language}
      onChange={(value) => {
        void i18n.changeLanguage(value);
      }}
      className={className}
      options={SUPPORTED_LANGUAGES.map((code) => ({
        value: code,
        label: LANGUAGE_FLAGS[code],
      }))}
    />
  );
}
