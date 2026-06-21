import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES } from "@/core/i18n/types";
import { cn } from "@/lib/utils";

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
    <label className={cn("flex items-center", className)}>
      <span className="sr-only">{t("language.label")}</span>
      <select
        value={i18n.language}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="cursor-pointer appearance-none rounded border-none bg-transparent py-0.5 pl-0.5 pr-4 text-lg leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
        aria-label={t("language.label")}
      >
        {SUPPORTED_LANGUAGES.map((code) => (
          <option key={code} value={code}>
            {LANGUAGE_FLAGS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
