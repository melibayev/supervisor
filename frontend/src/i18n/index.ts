import { useTheme } from '../context/ThemeContext';
import { translations, TranslationKey } from './translations';
import { ru } from 'date-fns/locale/ru';
import { uz } from 'date-fns/locale/uz';
import type { Locale } from 'date-fns';

const DATE_LOCALES: Record<string, Locale> = { ru, uz };

export function getDateLocale(language: string): Locale | undefined {
  return DATE_LOCALES[language];
}

export function useTranslation() {
  const { language } = useTheme();

  function t(key: TranslationKey): string {
    const entry = translations[key];
    if (!entry) return key;
    return entry[language] || entry.en || key;
  }

  const dateLocale = getDateLocale(language);

  return { t, language, dateLocale };
}

export type { TranslationKey };
