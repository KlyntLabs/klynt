import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import cnAuth from "@/locales/cn/auth.json";
import cnCommon from "@/locales/cn/common.json";
import cnErrors from "@/locales/cn/errors.json";
import cnHome from "@/locales/cn/home.json";
import cnMarketing from "@/locales/cn/marketing.json";
import cnTenant from "@/locales/cn/tenant.json";
import cnUi from "@/locales/cn/ui.json";
import cnValidation from "@/locales/cn/validation.json";
import enAuth from "@/locales/en/auth.json";
import enCommon from "@/locales/en/common.json";
import enErrors from "@/locales/en/errors.json";
import enHome from "@/locales/en/home.json";
import enMarketing from "@/locales/en/marketing.json";
import enTenant from "@/locales/en/tenant.json";
import enUi from "@/locales/en/ui.json";
import enValidation from "@/locales/en/validation.json";
import viAuth from "@/locales/vi/auth.json";
import viCommon from "@/locales/vi/common.json";
import viErrors from "@/locales/vi/errors.json";
import viHome from "@/locales/vi/home.json";
import viMarketing from "@/locales/vi/marketing.json";
import viTenant from "@/locales/vi/tenant.json";
import viUi from "@/locales/vi/ui.json";
import viValidation from "@/locales/vi/validation.json";
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "./types";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    ns: ["common", "auth", "errors", "ui", "validation", "home", "marketing", "tenant"],
    defaultNS: "common",
    resources: {
      en: {
        auth: enAuth,
        common: enCommon,
        errors: enErrors,
        home: enHome,
        marketing: enMarketing,
        tenant: enTenant,
        ui: enUi,
        validation: enValidation,
      },
      vi: {
        auth: viAuth,
        common: viCommon,
        errors: viErrors,
        home: viHome,
        marketing: viMarketing,
        tenant: viTenant,
        ui: viUi,
        validation: viValidation,
      },
      cn: {
        auth: cnAuth,
        common: cnCommon,
        errors: cnErrors,
        home: cnHome,
        marketing: cnMarketing,
        tenant: cnTenant,
        ui: cnUi,
        validation: cnValidation,
      },
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "klynt-language",
    },
    interpolation: {
      escapeValue: true,
    },
  });

export default i18n;
