import { useTranslation } from "react-i18next";

/**
 * Centralized accessor for the `marketing` i18n namespace.
 *
 * Provides typed helpers for the common `returnObjects: true` patterns used
 * across marketing pages, so components don't scatter `as` casts.
 */
export function useMarketingTranslation() {
  const { t, i18n } = useTranslation("marketing");

  return {
    t,
    language: i18n.language,
    array: <T>(key: string): T[] => t(key as never, { returnObjects: true }) as T[],
    object: <T>(key: string): T => t(key as never, { returnObjects: true }) as T,
  };
}
