import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Store, XCircle, AlertTriangle, CheckCircle, AlertOctagon } from 'lucide-react';
import type { DashboardStoreCoverageItem } from '@/types';
import { useTranslation } from '@/i18n';

interface Props {
  stores: DashboardStoreCoverageItem[];
}

const statusConfig = {
  Critical: {
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-700',
    label: 'Critical',
    rowBg: 'bg-red-50/50',
  },
  Warning: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700',
    label: 'Due Soon',
    rowBg: 'bg-amber-50/30',
  },
  Good: {
    dot: 'bg-green-500',
    badge: 'bg-green-100 text-green-700',
    label: 'Good',
    rowBg: '',
  },
  NeverVisited: {
    dot: 'bg-slate-400',
    badge: 'bg-slate-100 text-slate-600',
    label: 'Never Visited',
    rowBg: '',
  },
};

const sortOrder: Record<string, number> = { Critical: 0, Warning: 1, NeverVisited: 2, Good: 3 };

export default function StoreCoverageSection({ stores }: Props) {
  const { t, dateLocale } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  const sorted = [...stores].sort(
    (a, b) => (sortOrder[a.coverageStatus] ?? 4) - (sortOrder[b.coverageStatus] ?? 4)
  );
  const displayed = showAll ? sorted : sorted.slice(0, 8);

  const counts = {
    critical: stores.filter(s => s.coverageStatus === 'Critical').length,
    warning: stores.filter(s => s.coverageStatus === 'Warning').length,
    good: stores.filter(s => s.coverageStatus === 'Good').length,
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center">
            <Store className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">{t('dash.storeCoverageThisWeek' as any)}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{stores.length} {t('dash.storesInRegion' as any)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
            {counts.critical > 0 && (
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700">
              {counts.critical} {t('dash.critical' as any)}
            </span>
          )}
          {counts.warning > 0 && (
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700">
              {counts.warning} {t('dash.dueSoon' as any)}
            </span>
          )}
          {counts.good > 0 && (
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-700">
              {counts.good} {t('dash.good' as any)}
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-50">
        {displayed.map(store => {
          const s = statusConfig[store.coverageStatus] ?? statusConfig.Good;
          return (
            <div
              key={store.storeId}
              className={`flex items-center gap-4 px-6 py-3.5 ${s.rowBg}`}
            >
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{store.storeName}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {store.lastVisitDate
                    ? `${t('dash.lastVisited' as any)} ${formatDistanceToNow(new Date(store.lastVisitDate), { addSuffix: true, locale: dateLocale })} ${t('dash.by' as any)} ${store.lastVisitEmployeeName}`
                    : t('dash.noVisitsRecorded' as any)}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-slate-900">{store.visitsThisWeek}</p>
                <p className="text-xs text-slate-400">this week</p>
              </div>
              <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${s.badge}`}>
                {store.daysSinceLastVisit != null
                  ? store.daysSinceLastVisit === 0
                    ? 'Today'
                    : store.daysSinceLastVisit === 1
                    ? 'Yesterday'
                    : `${store.daysSinceLastVisit}d ago`
                  : s.label}
              </span>
            </div>
          );
        })}
      </div>

      {stores.length > 8 && (
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-violet-600 font-semibold hover:underline"
          >
            {showAll ? t('dash.showLess' as any) : `${t('dash.showAll' as any)} ${stores.length} ${t('dash.storesRemaining' as any)}`}
          </button>
        </div>
      )}
    </div>
  );
}
