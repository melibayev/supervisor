import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useTranslation } from '@/i18n';
import { localizeRegionName } from '@/constants/regions';
import AnalyticsSectionCard from './AnalyticsSectionCard';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import type { StoreFrequencyItem } from '@/types';

interface Props {
  from: string;
  to: string;
  regionId?: string;
  widgetId?: string;
  isPinned?: boolean;
  onPinToggle?: () => void;
}

const STATUS_STYLES: Record<string, { variant: 'success' | 'warning' | 'destructive' | 'secondary'; label: string }> = {
  OnSchedule: { variant: 'success', label: 'On Schedule' },
  DueSoon: { variant: 'warning', label: 'Due Soon' },
  Overdue: { variant: 'destructive', label: 'Overdue' },
  NeverVisited: { variant: 'secondary', label: 'Never Visited' },
};

export default function StoreFrequencySection({ from, to, regionId, widgetId, isPinned, onPinToggle }: Props) {
  const { t, language, dateLocale } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'store-frequency', from, to, regionId],
    queryFn: () => api.getStoreFrequency(from, to, regionId),
  });

  const summary = data ? {
    onSchedule: data.stores.filter(s => s.frequencyStatus === 'OnSchedule').length,
    dueSoon: data.stores.filter(s => s.frequencyStatus === 'DueSoon').length,
    overdue: data.stores.filter(s => s.frequencyStatus === 'Overdue').length,
    neverVisited: data.stores.filter(s => s.frequencyStatus === 'NeverVisited').length,
  } : null;

  const STATUS_LABELS: Record<string, string> = {
    OnSchedule: t('anStore.onSchedule'),
    DueSoon: t('anStore.dueSoon'),
    Overdue: t('anStore.overdue'),
    NeverVisited: t('anStore.neverVisited'),
  };

  return (
    <AnalyticsSectionCard title={t('anStore.title')} description={t('anStore.desc')} isLoading={isLoading} widgetId={widgetId} isPinned={isPinned} onPinToggle={onPinToggle}>
      {summary && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          <MiniKPI label={t('anStore.onSchedule')} value={summary.onSchedule} color="text-green-600" />
          <MiniKPI label={t('anStore.dueSoon')} value={summary.dueSoon} color="text-yellow-600" />
          <MiniKPI label={t('anStore.overdue')} value={summary.overdue} color="text-red-600" />
          <MiniKPI label={t('anStore.neverVisited')} value={summary.neverVisited} color="text-muted-foreground" />
        </div>
      )}

      {data && data.stores.length > 0 && (
        <div className="overflow-auto max-h-[400px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card">
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-2 font-medium">{t('anStore.store')}</th>
                <th className="p-2 font-medium">{t('anStore.region')}</th>
                <th className="p-2 font-medium text-center">{t('anStore.total')}</th>
                <th className="p-2 font-medium text-center">{t('anStore.week')}</th>
                <th className="p-2 font-medium text-center">{t('anStore.month')}</th>
                <th className="p-2 font-medium">{t('anStore.lastVisit')}</th>
                <th className="p-2 font-medium">{t('anStore.status')}</th>
              </tr>
            </thead>
            <tbody>
              {data.stores.map(store => {
                const style = STATUS_STYLES[store.frequencyStatus] ?? STATUS_STYLES.NeverVisited;
                return (
                  <tr key={store.storeId} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-2 font-medium">{store.storeName}</td>
                    <td className="p-2 text-muted-foreground">{localizeRegionName(store.regionName, language)}</td>
                    <td className="p-2 text-center">{store.totalVisits}</td>
                    <td className="p-2 text-center">{store.visitsThisWeek}</td>
                    <td className="p-2 text-center">{store.visitsThisMonth}</td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {store.lastVisitDate
                        ? formatDistanceToNow(new Date(store.lastVisitDate), { addSuffix: true, locale: dateLocale })
                        : '-'}
                    </td>
                    <td className="p-2">
                      <Badge variant={style.variant}>{STATUS_LABELS[store.frequencyStatus] ?? style.label}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && data.stores.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">{t('anStore.noStores')}</p>
      )}
    </AnalyticsSectionCard>
  );
}

function MiniKPI({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
