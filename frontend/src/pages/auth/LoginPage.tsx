import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { ApiError } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MapPin, Eye, EyeOff, Clock, XCircle } from 'lucide-react';
import { useTranslation } from '@/i18n';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loginStatus, setLoginStatus] = useState<{ type: 'pending' | 'rejected'; message: string; reason?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoginStatus(null);
    setLoading(true);
    try {
      await login(email, password);
      const user = useAuthStore.getState().user;
      navigate(user?.role === 'Employee' ? '/dashboard' : '/admin');
    } catch (err) {
      if (err instanceof ApiError) {
        try {
          const data = JSON.parse(err.body);
          if (data.error === 'ACCOUNT_PENDING') {
            setLoginStatus({ type: 'pending', message: data.message });
            return;
          }
          if (data.error === 'ACCOUNT_REJECTED') {
            setLoginStatus({ type: 'rejected', message: data.message, reason: data.reason });
            return;
          }
        } catch { /* ignore parse errors */ }
      }
      setError(t('auth.invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  const demoLogins = [
    { label: 'Employee', email: 'amir@lg.com' },
    { label: 'Admin', email: 'admin@lg.com' },
    { label: 'SuperAdmin', email: 'superadmin@lg.com' }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30">
            <MapPin className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl">{t('auth.lgElectronics')} Supervisor</CardTitle>
            <CardDescription>{t('auth.fieldSupervisor')}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {loginStatus?.type === 'pending' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">{t('auth.accountPendingApproval')}</p>
                  <p className="text-xs text-amber-700 mt-0.5">{t('auth.accountPendingDesc')}</p>
                </div>
              </div>
            )}

            {loginStatus?.type === 'rejected' && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-800">{t('auth.registrationNotApproved')}</p>
                  {loginStatus.reason && (
                    <p className="text-xs text-red-700 mt-0.5">{t('auth.reason')} {loginStatus.reason}</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@lg.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.enterPassword')}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('auth.signingIn') : t('auth.login')}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <p className="text-xs text-muted-foreground text-center mb-3">{t('auth.quickDemoLogin')}</p>
            <div className="flex gap-2">
              {demoLogins.map(demo => (
                <Button
                  key={demo.email}
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => {
                    setEmail(demo.email);
                    setPassword('Password123!');
                  }}
                >
                  {demo.label}
                </Button>
              ))}
            </div>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="text-primary font-semibold hover:underline">
              {t('auth.register')}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
