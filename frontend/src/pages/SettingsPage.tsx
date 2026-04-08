import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useTheme, ACCENT_HEX, type AccentColor, type Theme, type Language } from '@/context/ThemeContext';
import { api } from '@/api/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User, Palette, Save, Camera,
  Check, Monitor, Sun, Moon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

const tabs = [
  { id: 'profile', label: 'settings.profile', icon: User },
  { id: 'appearance', label: 'settings.appearance', icon: Palette },
];

const themeOptions: { value: Theme; label: string; icon: React.ElementType }[] = [
  { value: 'light', label: 'settings.light', icon: Sun },
  { value: 'dark', label: 'settings.dark', icon: Moon },
  { value: 'system', label: 'settings.system', icon: Monitor },
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

export default function SettingsPage() {
  const { user } = useAuthStore();
  const { theme, setTheme, accentColor, setAccentColor, language, setLanguage } = useTheme();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') ?? 'profile';
  const setActiveTab = (tab: string) => {
    setSearchParams(prev => { prev.set('tab', tab); return prev; });
  };
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    fullName: user?.fullName ?? '',
    email: user?.email ?? '',
    phoneNumber: user?.phoneNumber ?? '',
  });

  const updateMutation = useMutation({
    mutationFn: (data: { fullName: string; email: string; phoneNumber: string }) =>
      api.updateProfile(data),
    onSuccess: (updatedUser) => {
      useAuthStore.setState({ user: updatedUser as any });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setForm({ fullName: (updatedUser as any).fullName, email: (updatedUser as any).email, phoneNumber: (updatedUser as any).phoneNumber });
    },
  });

  const initials = user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('settings.title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('settings.subtitle')}</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-8">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center',
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {t(tab.label as any)}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-5 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {initials}
              </div>
              <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg">
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{user?.fullName}</h3>
              <p className="text-sm text-slate-400">{user?.role} · {t('settings.joined')} {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ''}</p>
            </div>
          </div>

          <form onSubmit={e => { e.preventDefault(); updateMutation.mutate(form); }} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('settings.fullName')}</label>
                <input value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('settings.emailAddress')}</label>
                <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors" />
              </div>
            </div>
            <div className="sm:w-1/2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('settings.phoneNumber')}</label>
              <input value={form.phoneNumber} onChange={e => setForm(p => ({ ...p, phoneNumber: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors" />
            </div>
            <div className="pt-2">
              <button type="submit" disabled={updateMutation.isPending}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                {updateMutation.isPending ? t('common.saving') : <><Save className="h-4 w-4" /> {t('common.saveChanges')}</>}
              </button>
              {updateMutation.isSuccess && (
                <div className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">{t('settings.profileUpdated')}</span>
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Appearance Tab */}
      {activeTab === 'appearance' && (
        <div className="space-y-6">
          {/* Theme */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">{t('settings.themeMode')}</h3>
            <div className="grid grid-cols-3 gap-3">
              {themeOptions.map(opt => (
                <button key={opt.value} onClick={() => setTheme(opt.value)}
                  className={cn(
                    'flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all text-sm font-medium',
                    theme === opt.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-200'
                  )}>
                  <opt.icon className="h-6 w-6" />
                  {t(opt.label as any)}
                </button>
              ))}
            </div>
          </div>

          {/* Accent */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">{t('settings.accentColor')}</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {accentOptions.map(opt => (
                <button key={opt.value} onClick={() => setAccentColor(opt.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all',
                    accentColor === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'
                  )}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: ACCENT_HEX[opt.value] }}>
                    {accentColor === opt.value && <Check className="h-4 w-4 text-white" />}
                  </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">{t('settings.language')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {languageOptions.map(opt => (
                <button key={opt.value} onClick={() => setLanguage(opt.value)}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-sm',
                    language === opt.value
                      ? 'border-primary bg-primary/5 font-medium'
                      : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'
                  )}>
                  <span className="text-lg">{opt.flag}</span>
                  <span className="text-slate-700 dark:text-slate-300">{opt.label}</span>
                  {language === opt.value && <Check className="h-4 w-4 text-primary ml-auto" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
