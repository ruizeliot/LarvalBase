'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { translations, type Language, SECTION_TITLE_KEYS, TRAIT_NAME_KEYS, SECTION_TOOLTIP_TRANSLATIONS, COMMON_NAME_LANGUAGE_MAP } from './translations';

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  /** Translate a section title (e.g., 'Egg & Incubation' -> French equivalent) */
  tSection: (englishTitle: string) => string;
  /** Translate a trait name by its key */
  tTrait: (traitKey: string) => string;
  /** Get section tooltip in current language */
  tSectionTooltip: (englishTitle: string) => string;
  /** Get common names language value for CSV lookup */
  commonNamesLang: string;
}

const I18nContext = createContext<I18nContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
  tSection: (title: string) => title,
  tTrait: (key: string) => key,
  tSectionTooltip: (title: string) => title,
  commonNamesLang: 'English',
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('larvalbase-lang') as Language | null;
    if (['en','fr','es','pt','de','ja','zh','hi','ar','ru'].includes(saved)) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('larvalbase-lang', lang);
  }, []);

  const t = useCallback((key: string) => {
    const strings = translations[language];
    return (strings as Record<string, string>)[key] ?? key;
  }, [language]);

  const tSection = useCallback((englishTitle: string) => {
    const translationKey = SECTION_TITLE_KEYS[englishTitle];
    if (!translationKey) return englishTitle;
    return (translations[language] as Record<string, string>)[translationKey] ?? englishTitle;
  }, [language]);

  const tTrait = useCallback((traitKey: string) => {
    const translationKey = TRAIT_NAME_KEYS[traitKey];
    if (!translationKey) return traitKey;
    return (translations[language] as Record<string, string>)[translationKey] ?? traitKey;
  }, [language]);

  const tSectionTooltip = useCallback((englishTitle: string) => {
    return SECTION_TOOLTIP_TRANSLATIONS[language]?.[englishTitle] ?? '';
  }, [language]);

  const commonNamesLang = COMMON_NAME_LANGUAGE_MAP[language];

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, tSection, tTrait, tSectionTooltip, commonNamesLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
