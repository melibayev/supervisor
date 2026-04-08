import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/context/ThemeContext';
import {
  Search, Moon, Sun, Palette, Menu,
  Settings, LogOut, User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import NotificationBell from '@/components/notifications/NotificationBell';
import { useTranslation } from '@/i18n';

interface HeaderProps {
  onMenuClick: () => void;
  onCustomizeOpen: () => void;
}

export default function Header({ onMenuClick, onCustomizeOpen }: HeaderProps) {
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials = user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '';

  const handleLogout = async () => {
    setAvatarOpen(false);
    await logout();
    window.location.href = '/login';
  };

  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-6 flex-shrink-0 sticky top-0 z-30">
      {/* Left: hamburger + search */}
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden sm:flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-lg px-3 py-2 w-64 text-sm text-slate-400">
          <Search className="h-4 w-4 flex-shrink-0" />
          <span className="text-slate-400">{t('common.searchPlaceholder')}</span>
          <kbd className="ml-auto text-[10px] font-mono bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-1.5 py-0.5 text-slate-400">⌘K</kbd>
        </div>
      </div>

      {/* Right: action icons */}
      <div className="flex items-center gap-1">
        {/* Dark mode */}
        <button onClick={toggleTheme} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Customize */}
        <button onClick={onCustomizeOpen} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          <Palette className="h-5 w-5" />
        </button>

        {/* Notifications */}
        <NotificationBell />

        {/* Avatar dropdown */}
        <div ref={avatarRef} className="relative ml-1">
          <button onClick={() => { setAvatarOpen(!avatarOpen); }} className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              {initials}
            </div>
          </button>

          {avatarOpen && (
            <div className="absolute right-0 top-12 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 py-1">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.fullName}</div>
                <div className="text-xs text-slate-400 truncate">{user?.email}</div>
              </div>
              <div className="py-1">
                <button onClick={() => { setAvatarOpen(false); navigate('/settings'); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <User className="h-4 w-4" /> {t('common.profile')}
                </button>
                <button onClick={() => { setAvatarOpen(false); navigate('/settings'); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <Settings className="h-4 w-4" /> {t('nav.settings')}
                </button>
              </div>
              <div className="border-t border-slate-100 dark:border-slate-800 py-1">
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <LogOut className="h-4 w-4" /> {t('common.signOut')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
