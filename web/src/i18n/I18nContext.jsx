import { createContext, useContext, useMemo, useState } from "react";
import { APP_UI_LANGUAGES, LANGUAGE_NAMES, translations } from "./translations";

const STORAGE_KEY = "post_this_app_lang";

function normalizeLang(value) {
  const base = String(value || "").toLowerCase().split(/[-_]/)[0];
  if (APP_UI_LANGUAGES.includes(base)) return base;
  return "en";
}

function getRegionTag(locale) {
  const tag = String(locale || "");
  const parts = tag.split(/[-_]/);
  if (parts.length >= 2) return parts[1].toUpperCase();
  try {
    if (typeof Intl?.Locale === "function") {
      const parsed = new Intl.Locale(tag);
      return (parsed.region || "").toUpperCase();
    }
  } catch {
    // ignore parse errors
  }
  return "";
}

function detectInitialLanguage() {
  if (typeof window === "undefined") {
    return {
      lang: "nl",
      shouldPrompt: true,
      localLang: "nl",
      region: "NL",
    };
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const lang = normalizeLang(saved);
    return {
      lang,
      shouldPrompt: false,
      localLang: lang,
      region: "",
    };
  }

  return {
    lang: "nl",
    shouldPrompt: true,
    localLang: "nl",
    region: "",
  };
}

const initial = detectInitialLanguage();

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(initial.lang);
  const [shouldPromptLanguage, setShouldPromptLanguage] = useState(initial.shouldPrompt);
  const [detectedLocalLang] = useState(initial.localLang);

  function setLang(next) {
    const normalized = normalizeLang(next);
    setLangState(normalized);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, normalized);
    }
  }

  function confirmLanguageChoice(nextLang) {
    setLang(nextLang);
    setShouldPromptLanguage(false);
  }

  function t(key, vars) {
    const table = translations[lang] || translations.en;
    const fallback = translations.nl;
    const value = table[key] || fallback[key] || key;
    if (!vars) return value;
    return Object.keys(vars).reduce(
      (acc, current) => acc.replaceAll(`{${current}}`, String(vars[current])),
      value
    );
  }

  function getLanguageName(code) {
    const normalized = normalizeLang(code);
    return LANGUAGE_NAMES[normalized]?.[lang] || LANGUAGE_NAMES[normalized]?.en || normalized;
  }

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t,
      shouldPromptLanguage,
      detectedLocalLang,
      confirmLanguageChoice,
      getLanguageName,
    }),
    [lang, shouldPromptLanguage, detectedLocalLang]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return ctx;
}
