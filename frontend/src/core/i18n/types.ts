import "i18next";
import type auth from "@/locales/en/auth.json";
import type common from "@/locales/en/common.json";
import type errors from "@/locales/en/errors.json";
import type home from "@/locales/en/home.json";
import type ui from "@/locales/en/ui.json";
import type validation from "@/locales/en/validation.json";

export type SupportedLanguage = "en" | "vi" | "cn";
export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["en", "vi", "cn"];
export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: {
      common: typeof common;
      auth: typeof auth;
      errors: typeof errors;
      home: typeof home;
      ui: typeof ui;
      validation: typeof validation;
    };
  }
}
