import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useTranslation } from '@/i18n';
import { localizeRegionName } from '@/constants/regions';
import AnalyticsSectionCard from './AnalyticsSectionCard';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';
import { AlertTriangle } from 'lucide-react';

interface Props {
  from: string;
  to: string;
  regionId?: string;
  widgetId?: string;
  isPinned?: boolean;
  onPinToggle?: () => void;
}

export default function MissedPatternsSection({ from, to, regionId, widgetId, isPinned, onPinToggle }: Props) {
  const { t, language, dateLocale } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'missed-patterns', from, to, regionId],
    queryFn: () => api.getMissedPatterns(from, to, regionId),
  });

  return (
    <AnalyticsSectionCard title={t('anMiss.title')} description={t('anMiss.desc')} isLoading={isLoading} widgetId={widgetId} isPinned={isPinned} onPinToggle={onPinToggle}>
      {data && (
        <>
          {/* Header stat */}
          <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <p className="text-sm">
              <span className="font-bold text-red-600">{data.totalMissed}</span>
              <span className="text-muted-foreground"> {t('anMiss.missedInPeriod')}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* By Day of Week */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">{t('anMiss.byDayOfWeek')}</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.byDayOfWeek.map(d => ({ ...d, day: t(('day.' + d.day) as any) || d.day }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ef4444" name={t('anComp.missed')} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Daily Trend */}
            {data.trend.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">{t('anMiss.dailyTrend')}</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data.trend.map(t => ({ ...t, label: format(new Date(t.date), 'MMM d', { locale: dateLocale }) }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="missed" stroke="#ef4444" strokeWidth={2} dot={false} name={t('anComp.missed')} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Missing Employees */}
            {data.topMissingEmployees.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">{t('anMiss.topMissingEmployees')}</p>
                <div className="space-y-2">
                  {data.topMissingEmployees.map(e => (
                    <div key={e.employeeId} className="flex items-center justify-between p-2 rounded border text-sm">
                      <div>
                        <p className="font-medium">{e.employeeName}</p>
                        <p className="text-xs text-muted-foreground">{localizeRegionName(e.regionName, language)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-red-600 font-bold">{e.missedCount}/{e.totalScheduled}</p>
                        <p className="text-[10px] text-muted-foreground">{e.missRate}% {t('anMiss.missRate')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Missed Stores */}
            {data.topMissedStores.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">{t('anMiss.topMissedStores')}</p>
                <div className="space-y-2">
                  {data.topMissedStores.map(s => (
                    <div key={s.storeId} className="flex items-center justify-between p-2 rounded border text-sm">
                      <div>
                        <p className="font-medium">{s.storeName}</p>
                        <p className="text-xs text-muted-foreground">{localizeRegionName(s.regionName, language)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-red-600 font-bold">{s.missedCount}/{s.totalScheduled}</p>
                        <p className="text-[10px] text-muted-foreground">{s.missRate}% {t('anMiss.missRate')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </AnalyticsSectionCard>
  );
}
