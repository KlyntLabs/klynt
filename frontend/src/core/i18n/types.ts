import "i18next";
import type auth from "../../../public/locales/en/auth.json";
import type common from "../../../public/locales/en/common.json";
import type errors from "../../../public/locales/en/errors.json";
import type ui from "../../../public/locales/en/ui.json";
import type validation from "../../../public/locales/en/validation.json";

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
      ui: typeof ui;
      validation: typeof validation;
    };
  }
}
