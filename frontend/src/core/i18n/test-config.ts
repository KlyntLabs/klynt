import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import cnAuth from "../../../public/locales/cn/auth.json";
import cnCommon from "../../../public/locales/cn/common.json";
import cnErrors from "../../../public/locales/cn/errors.json";
import cnUi from "../../../public/locales/cn/ui.json";
import cnValidation from "../../../public/locales/cn/validation.json";
import enAuth from "../../../public/locales/en/auth.json";
import enCommon from "../../../public/locales/en/common.json";
import enErrors from "../../../public/locales/en/errors.json";
import enUi from "../../../public/locales/en/ui.json";
import enValidation from "../../../public/locales/en/validation.json";
import viAuth from "../../../public/locales/vi/auth.json";
import viCommon from "../../../public/locales/vi/common.json";
import viErrors from "../../../public/locales/vi/errors.json";
import viUi from "../../../public/locales/vi/ui.json";
import viValidation from "../../../public/locales/vi/validation.json";

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
