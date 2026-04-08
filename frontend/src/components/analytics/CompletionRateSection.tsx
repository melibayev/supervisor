import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useTranslation } from '@/i18n';
import { localizeRegionName } from '@/constants/regions';
import AnalyticsSectionCard from './AnalyticsSectionCard';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import type { CompletionRateData } from '@/types';

interface Props {
  from: string;
  to: string;
  regionId?: string;
  widgetId?: string;
  isPinned?: boolean;
  onPinToggle?: () => void;
}

export default function CompletionRateSection({ from, to, regionId, widgetId, isPinned, onPinToggle }: Props) {
  const { t, language, dateLocale } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'completion-rate', from, to, regionId],
    queryFn: () => api.getCompletionRate(from, to, regionId),
  });

  const overall = data?.overall;

  return (
    <AnalyticsSectionCard title={t('anComp.title')} description={t('anComp.desc')} isLoading={isLoading} widgetId={widgetId} isPinned={isPinned} onPinToggle={onPinToggle}>
      {overall && (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <KPI label={t('anComp.scheduled')} value={overall.scheduled} />
            <KPI label={t('anComp.completed')} value={overall.completed} color="text-green-600" />
            <KPI label={t('anComp.completionRate')} value={`${overall.completionRate}%`} color="text-blue-600" />
            <KPI label={t('anComp.onTimeRate')} value={`${overall.onTimeRate}%`} color="text-violet-600" />
          </div>

          {/* Trend Area Chart */}
          {data.trend.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-muted-foreground mb-2 font-medium">{t('anComp.dailyTrend')}</p>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data.trend.map(t => ({ ...t, label: format(new Date(t.date), 'MMM d', { locale: dateLocale }) }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="completed" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} name={t('anComp.completed')} />
                  <Area type="monotone" dataKey="missed" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} name={t('anComp.missed')} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* By Region Bars (SuperAdmin only) */}
          {data.byRegion && data.byRegion.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">{t('anComp.byRegion')}</p>
              <ResponsiveContainer width="100%" height={Math.max(200, data.byRegion.length * 36)}>
                <BarChart data={data.byRegion.map(r => ({ ...r, regionLabel: localizeRegionName(r.regionName, language) }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <YAxis dataKey="regionLabel" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="completionRate" fill="#CC0000" radius={[0, 4, 4, 0]} name={t('anComp.completionPct')} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </AnalyticsSectionCard>
  );
}

function KPI({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="text-center">
      <p className={`text-2xl font-bold ${color ?? ''}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
