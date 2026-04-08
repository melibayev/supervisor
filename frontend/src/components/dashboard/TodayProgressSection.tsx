import { format } from 'date-fns';
import { TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { RegionBadge } from '@/components/RegionBadge';
import type { DashboardTodayProgress } from '@/types';
import { useTranslation } from '@/i18n';

interface Props {
  progress: DashboardTodayProgress | undefined;
  isSuperAdmin: boolean;
}

export default function TodayProgressSection({ progress, isSuperAdmin }: Props) {
  const { t, dateLocale } = useTranslation();
  const overall = progress?.overall;

  if (!progress) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3 animate-pulse">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">{t('dash.todayVisitProgress' as any)}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('dash.updatesEvery30s' as any)}</p>
          </div>
        </div>
        <span className="text-xs text-slate-400">{format(new Date(), 'HH:mm', { locale: dateLocale })} {t('dash.localTime' as any)}</span>
      </div>

      <div className="p-6 space-y-6">
        {overall && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">
                {t('dash.overallComplete' as any).replace('{rate}', overall.completionRate.toFixed(0))}
              </span>
              <span className="text-xs text-slate-500">
                {t('dash.ofVisits' as any).replace('{done}', String(overall.completed)).replace('{total}', String(overall.scheduled))}
              </span>
            </div>

            <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-green-500 transition-all duration-700"
                style={{ width: `${overall.scheduled > 0 ? (overall.completed / overall.scheduled) * 100 : 0}%` }}
              />
              <div
                className="h-full bg-blue-400 animate-pulse transition-all duration-700"
                style={{ width: `${overall.scheduled > 0 ? (overall.inProgress / overall.scheduled) * 100 : 0}%` }}
              />
              <div
                className="h-full bg-red-400 transition-all duration-700"
                style={{ width: `${overall.scheduled > 0 ? (overall.missed / overall.scheduled) * 100 : 0}%` }}
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 mt-3">
              {[
                { color: 'bg-green-500', label: t('dash.completedToday'), value: overall.completed },
                { color: 'bg-blue-400', label: t('dash.inProgressNow'), value: overall.inProgress },
                { color: 'bg-red-400', label: t('dash.missedToday'), value: overall.missed },
                { color: 'bg-slate-200', label: t('dash.remaining' as any), value: overall.remaining },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                  <span className="text-xs text-slate-600">
                    {item.label}:{' '}
                    <span className="font-semibold text-slate-900">{item.value}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {isSuperAdmin && progress.byRegion && progress.byRegion.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              {t('dash.byRegion')}
            </p>
            <div className="space-y-3">
              {progress.byRegion
                .filter(r => r.scheduled > 0)
                .sort((a, b) => a.completionRate - b.completionRate)
                .map(region => (
                  <div key={region.regionId}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <RegionBadge regionId={region.regionId} />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>{region.completed}/{region.scheduled}</span>
                        <span className={`font-bold ${
                          region.completionRate >= 80 ? 'text-green-600' :
                          region.completionRate >= 50 ? 'text-amber-600' :
                          'text-red-600'
                        }`}>
                          {region.completionRate.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-green-500 transition-all duration-500"
                        style={{ width: `${(region.completed / region.scheduled) * 100}%` }}
                      />
                      <div
                        className="h-full bg-blue-400 transition-all duration-500"
                        style={{ width: `${(region.inProgress / region.scheduled) * 100}%` }}
                      />
                      <div
                        className="h-full bg-red-400 transition-all duration-500"
                        style={{ width: `${(region.missed / region.scheduled) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
