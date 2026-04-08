import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';
type AccentColor = 'violet' | 'emerald' | 'blue' | 'rose' | 'orange' | 'slate';
type Language = 'en' | 'ru' | 'uz';

const ACCENT_MAP: Record<AccentColor, string> = {
  violet: '263 70% 50.4%',
  emerald: '160 84% 39.4%',
  blue: '217 91% 60%',
  rose: '350 89% 60.2%',
  orange: '25 95% 53.1%',
  slate: '215 16% 47.1%',
};

const ACCENT_HEX: Record<AccentColor, string> = {
  violet: '#7C3AED',
  emerald: '#10B981',
  blue: '#3B82F6',
  rose: '#F43F5E',
  orange: '#F97316',
  slate: '#64748B',
};

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  accentColor: AccentColor;
  setAccentColor: (c: AccentColor) => void;
  language: Language;
  setLanguage: (l: Language) => void;
  accentHex: string;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  if (theme === 'system') {
    const sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    root.classList.add(sys);
  } else {
    root.classList.add(theme);
  }
}

function applyAccent(color: AccentColor) {
  document.documentElement.style.setProperty('--primary', ACCENT_MAP[color]);
  document.documentElement.style.setProperty('--ring', ACCENT_MAP[color]);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'light');
  const [accentColor, setAccentColorState] = useState<AccentColor>(() => (localStorage.getItem('accentColor') as AccentColor) || 'violet');
  const [language, setLanguageState] = useState<Language>(() => (localStorage.getItem('appLanguage') as Language) || 'ru');

  const setTheme = (t: Theme) => { localStorage.setItem('theme', t); setThemeState(t); };
  const setAccentColor = (c: AccentColor) => { localStorage.setItem('accentColor', c); setAccentColorState(c); };
  const setLanguage = (l: Language) => { localStorage.setItem('appLanguage', l); setLanguageState(l); };

  useEffect(() => { applyTheme(theme); }, [theme]);
  useEffect(() => { applyAccent(accentColor); }, [accentColor]);

  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, accentColor, setAccentColor, language, setLanguage, accentHex: ACCENT_HEX[accentColor] }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export { ACCENT_HEX, type AccentColor, type Theme, type Language };
