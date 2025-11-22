import i18n from "i18next";
import {initReactI18next} from "react-i18next";
import en from "@/locales/en/translation.json";
import zh from "@/locales/zh/translation.json";

type Lang = "en" | "zh" | "system";

const resources = {
  en: { translation: en },
  zh: { translation: zh },
} as const;

function resolveInitialLanguage(): Lang {
  const nav = typeof navigator !== "undefined" ? navigator.language : "en";
  return nav.toLowerCase().startsWith("zh") ? "zh" : "en";
}

i18n.use(initReactI18next).init({
  resources,
  lng: resolveInitialLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function setLanguage(lng: Lang) {
  if (lng === "system") {
    const nav = typeof navigator !== "undefined" ? navigator.language : "en";
    const resolved = nav.toLowerCase().startsWith("zh") ? "zh" : "en";
    i18n.changeLanguage(resolved);
    return;
  }
  i18n.changeLanguage(lng);
}

export { i18n };
