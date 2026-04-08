import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Pin, PinOff } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface Props {
  title: string;
  description?: string;
  isLoading?: boolean;
  children: React.ReactNode;
  action?: React.ReactNode;
  widgetId?: string;
  isPinned?: boolean;
  onPinToggle?: () => void;
}

export default function AnalyticsSectionCard({ title, description, isLoading, children, action, widgetId, isPinned, onPinToggle }: Props) {
  const { t } = useTranslation();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description && <CardDescription className="mt-1">{description}</CardDescription>}
        </div>
        <div className="flex items-center gap-2">
          {widgetId && onPinToggle && (
            <button
              onClick={onPinToggle}
              title={isPinned ? t('analytics.unpinFromDashboard') : t('analytics.pinToDashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                isPinned
                  ? 'bg-violet-100 border-violet-300 text-violet-700 hover:bg-red-50 hover:border-red-300 hover:text-red-600'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-700'
              }`}
            >
              {isPinned
                ? <><PinOff className="w-3.5 h-3.5" /> {t('analytics.unpinFromDashboard')}</>
                : <><Pin className="w-3.5 h-3.5" /> {t('analytics.pinToDashboard')}</>
              }
            </button>
          )}
          {action}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : children}
      </CardContent>
    </Card>
  );
}
