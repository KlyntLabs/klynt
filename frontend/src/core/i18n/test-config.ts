import cnAuth from "@/locales/cn/auth.json";
import cnCommon from "@/locales/cn/common.json";
import cnErrors from "@/locales/cn/errors.json";
import cnUi from "@/locales/cn/ui.json";
import cnValidation from "@/locales/cn/validation.json";
import enAuth from "@/locales/en/auth.json";
import enCommon from "@/locales/en/common.json";
import enErrors from "@/locales/en/errors.json";
import enUi from "@/locales/en/ui.json";
import enValidation from "@/locales/en/validation.json";
import viAuth from "@/locales/vi/auth.json";
import viCommon from "@/locales/vi/common.json";
import viErrors from "@/locales/vi/errors.json";
import viUi from "@/locales/vi/ui.json";
import viValidation from "@/locales/vi/validation.json";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  ns: ["common", "auth", "errors", "ui", "validation"],
  defaultNS: "common",
  resources: {
    en: {
      common: enCommon,
      auth: enAuth,
      errors: enErrors,
      ui: enUi,
      validation: enValidation,
    },
    vi: {
      common: viCommon,
      auth: viAuth,
      errors: viErrors,
      ui: viUi,
      validation: viValidation,
    },
    cn: {
      common: cnCommon,
      auth: cnAuth,
      errors: cnErrors,
      ui: cnUi,
      validation: cnValidation,
    },
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
