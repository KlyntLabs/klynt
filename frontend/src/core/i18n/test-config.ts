import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import cnAuth from "@/locales/cn/auth.json";
import cnCommon from "@/locales/cn/common.json";
import cnErrors from "@/locales/cn/errors.json";
import cnHome from "@/locales/cn/home.json";
import cnMarketing from "@/locales/cn/marketing.json";
import cnUi from "@/locales/cn/ui.json";
import cnValidation from "@/locales/cn/validation.json";
import enAuth from "@/locales/en/auth.json";
import enCommon from "@/locales/en/common.json";
import enErrors from "@/locales/en/errors.json";
import enHome from "@/locales/en/home.json";
import enMarketing from "@/locales/en/marketing.json";
import enUi from "@/locales/en/ui.json";
import enValidation from "@/locales/en/validation.json";
import viAuth from "@/locales/vi/auth.json";
import viCommon from "@/locales/vi/common.json";
import viErrors from "@/locales/vi/errors.json";
import viHome from "@/locales/vi/home.json";
import viMarketing from "@/locales/vi/marketing.json";
import viUi from "@/locales/vi/ui.json";
import viValidation from "@/locales/vi/validation.json";

i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  ns: ["common", "auth", "errors", "ui", "validation", "home", "marketing"],
  defaultNS: "common",
  resources: {
    en: {
      common: enCommon,
      auth: enAuth,
      errors: enErrors,
      home: enHome,
      marketing: enMarketing,
      ui: enUi,
      validation: enValidation,
    },
    vi: {
      common: viCommon,
      auth: viAuth,
      errors: viErrors,
      home: viHome,
      marketing: viMarketing,
      ui: viUi,
      validation: viValidation,
    },
    cn: {
      common: cnCommon,
      auth: cnAuth,
      errors: cnErrors,
      home: cnHome,
      marketing: cnMarketing,
      ui: cnUi,
      validation: cnValidation,
    },
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
