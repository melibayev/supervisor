import { X, Check, Monitor, Sun, Moon } from 'lucide-react';
import { useTheme, ACCENT_HEX, type AccentColor, type Theme, type Language } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

interface CustomizePanelProps {
  open: boolean;
  onClose: () => void;
}

const themeOptions: { value: Theme; label: string; icon: React.ElementType }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

const accentOptions: { value: AccentColor; label: string }[] = [
  { value: 'violet', label: 'Violet' },
  { value: 'blue', label: 'Blue' },
  { value: 'emerald', label: 'Emerald' },
  { value: 'rose', label: 'Rose' },
  { value: 'orange', label: 'Orange' },
  { value: 'slate', label: 'Slate' },
];

const languageOptions: { value: Language; label: string; flag: string }[] = [
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'ru', label: 'Русский', flag: '🇷🇺' },
  { value: 'uz', label: "O'zbekcha", flag: '🇺🇿' },
];

export default function CustomizePanel({ open, onClose }: CustomizePanelProps) {
  const { theme, setTheme, accentColor, setAccentColor, language, setLanguage } = useTheme();

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />}

      <div className={cn(
        'fixed top-0 right-0 h-full w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 transition-transform duration-300 ease-out flex flex-col',
        open ? 'translate-x-0' : 'translate-x-full'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Customize</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Theme */}
          <div>
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 block">Theme</label>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-xs font-medium',
                    theme === opt.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-200 dark:hover:border-slate-700'
                  )}
                >
                  <opt.icon className="h-5 w-5" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Accent Color */}
          <div>
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 block">Accent Color</label>
            <div className="grid grid-cols-3 gap-2">
              {accentOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setAccentColor(opt.value)}
                  className={cn(
                    'flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all text-xs font-medium',
                    accentColor === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                  )}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: ACCENT_HEX[opt.value] }}
                  >
                    {accentColor === opt.value && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <span className="text-slate-600 dark:text-slate-300">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div>
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 block">Language</label>
            <div className="space-y-1.5">
              {languageOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setLanguage(opt.value)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-sm',
                    language === opt.value
                      ? 'border-primary bg-primary/5 font-medium'
                      : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                  )}
                >
                  <span className="text-base">{opt.flag}</span>
                  <span className="text-slate-700 dark:text-slate-300">{opt.label}</span>
                  {language === opt.value && <Check className="h-4 w-4 text-primary ml-auto" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
