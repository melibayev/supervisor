import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { api, ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { RegionSelect } from '@/components/RegionSelect';
import { MapPin, Eye, EyeOff, CheckCircle, Clock, AlertCircle, User, Phone, Mail, Lock, Globe } from 'lucide-react';
import { useTranslation } from '@/i18n';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { t } = useTranslation();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    regionId: '',
    password: '',
    confirmPassword: '',
  });

  const registerMutation = useMutation({
    mutationFn: () => api.register({
      fullName: form.fullName,
      email: form.email,
      phoneNumber: form.phoneNumber,
      password: form.password,
      regionId: form.regionId,
    }),
    onSuccess: () => setSubmitted(true),
    onError: (err) => {
      if (err instanceof ApiError) {
        try {
          const data = JSON.parse(err.body);
          if (data.error === 'EMAIL_TAKEN') {
            setFieldErrors({ email: t('auth.emailAlreadyRegistered') });
            return;
          }
          if (data.message) {
            setFieldErrors({ _form: data.message });
            return;
          }
        } catch { /* ignore */ }
      }
      setFieldErrors({ _form: t('auth.registrationFailed') });
    },
  });

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (form.fullName.trim().length < 2) errors.fullName = t('auth.errNameMin');
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) errors.email = t('auth.errEmailInvalid');
    if (form.phoneNumber.length < 9) errors.phoneNumber = t('auth.errPhoneInvalid');
    if (!form.regionId) errors.regionId = t('auth.errRegionRequired');
    if (form.password.length < 8) errors.password = t('auth.errPasswordMin');
    if (form.password !== form.confirmPassword) errors.confirmPassword = t('auth.errPasswordMismatch');
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      registerMutation.mutate();
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 p-4">
        <Card className="w-full max-w-md border-0 shadow-2xl">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t('auth.registerTitle')}!</h1>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              {t('auth.registerSuccess')}
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-left mb-6">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> {t('auth.whatHappensNext')}
              </p>
              <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-1 ml-5">
                <li>• {t('auth.adminReviewsRequest')}</li>
                <li>• {t('auth.notifiedWhenApproved')}</li>
                <li>• {t('auth.loginWithCredentials')}</li>
              </ul>
            </div>
            <Button onClick={() => navigate('/login')} className="w-full">
              {t('auth.backToLogin')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 p-4">
      <Card className="w-full max-w-[480px] border-0 shadow-2xl overflow-hidden">
        {/* Header band */}
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-5 text-center text-white">
          <div className="mx-auto w-11 h-11 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center mb-3">
            <MapPin className="h-5 w-5" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">{t('auth.registerTitle')}</h1>
          <p className="text-violet-200 text-xs mt-0.5">{t('auth.registerSubtitle')}</p>
        </div>

        <CardContent className="p-5 sm:p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {fieldErrors._form && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm px-3 py-2.5 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {fieldErrors._form}
              </div>
            )}

            {/* Personal info section */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('auth.personalInfo')}</legend>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="fullName" className="text-xs font-medium">{t('auth.fullName')}</Label>
                  <div className="relative">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      id="fullName"
                      placeholder="Amir Karimov"
                      value={form.fullName}
                      onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))}
                      autoComplete="name"
                      className="h-9 pl-8 text-sm"
                    />
                  </div>
                  {fieldErrors.fullName && <p className="text-[11px] text-red-500">{fieldErrors.fullName}</p>}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="phoneNumber" className="text-xs font-medium">{t('auth.phoneNumber')}</Label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      id="phoneNumber"
                      type="tel"
                      placeholder="+998 90 123 45 67"
                      value={form.phoneNumber}
                      onChange={e => setForm(p => ({ ...p, phoneNumber: e.target.value }))}
                      autoComplete="tel"
                      className="h-9 pl-8 text-sm"
                    />
                  </div>
                  {fieldErrors.phoneNumber && <p className="text-[11px] text-red-500">{fieldErrors.phoneNumber}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs font-medium">{t('auth.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="amir@example.com"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      autoComplete="email"
                      className="h-9 pl-8 text-sm"
                    />
                  </div>
                  {fieldErrors.email && <p className="text-[11px] text-red-500">{fieldErrors.email}</p>}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">{t('common.region')}</Label>
                  <div className="relative">
                    <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none z-10" />
                    <RegionSelect
                      value={form.regionId}
                      onChange={v => setForm(p => ({ ...p, regionId: v }))}
                      placeholder={t('auth.selectRegionPlaceholder')}
                      className="pl-8"
                    />
                  </div>
                  {fieldErrors.regionId && <p className="text-[11px] text-red-500">{fieldErrors.regionId}</p>}
                </div>
              </div>
            </fieldset>

            {/* Divider */}
            <div className="border-t" />

            {/* Security section */}
            <fieldset className="space-y-3">
              <legend className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t('auth.security')}</legend>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="password" className="text-xs font-medium">{t('auth.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('auth.minCharsPassword')}
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      autoComplete="new-password"
                      className="h-9 pl-8 pr-9 text-sm"
                    />
                    <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {fieldErrors.password && <p className="text-[11px] text-red-500">{fieldErrors.password}</p>}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="confirmPassword" className="text-xs font-medium">{t('auth.confirmPassword')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder={t('auth.repeatPassword')}
                      value={form.confirmPassword}
                      onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                      autoComplete="new-password"
                      className="h-9 pl-8 pr-9 text-sm"
                    />
                    <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowConfirm(!showConfirm)}>
                      {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && <p className="text-[11px] text-red-500">{fieldErrors.confirmPassword}</p>}
                </div>
              </div>
            </fieldset>

            <Button type="submit" className="w-full h-10 font-semibold" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? t('auth.registering') : t('auth.register')}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-4">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="text-violet-600 dark:text-violet-400 font-semibold hover:underline">
              {t('auth.login')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
