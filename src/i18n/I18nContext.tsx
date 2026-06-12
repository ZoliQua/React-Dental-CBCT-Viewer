/**
 * Lightweight i18n: language state (default English, persisted) and a t()
 * lookup with {param} interpolation. English is the fallback for missing keys.
 */

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { translations, type Language } from './translations';

const STORAGE_KEY = 'rdcv-lang';

interface I18nValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function initialLang(): Language {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored in translations) return stored as Language;
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(initialLang);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    let text = translations[lang][key] ?? translations.en[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
