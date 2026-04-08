import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Clock, User as UserIcon, ChevronDown, ThumbsUp, ThumbsDown, Camera, Package,
  Navigation, Calendar, CheckCircle
} from 'lucide-react';
import { format, differenceInDays, startOfDay, isSameMonth, differenceInMinutes } from 'date-fns';
import type { Locale } from 'date-fns';
import type { StoreVisitItem } from '@/types';

function formatDurationShort(start: string, end: string): string {
  const mins = differenceInMinutes(new Date(end), new Date(start));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getDateGroupLabel(dateStr: string, t: (key: string) => string, locale?: Locale): string {
  const date = new Date(dateStr);
  const today = startOfDay(new Date());
  const diffDays = differenceInDays(today, startOfDay(date));
  if (diffDays === 0) return t('empVisit.today');
  if (diffDays === 1) return t('empVisit.yesterday');
  if (diffDays <= 7) return format(date, 'EEEE, MMM d', { locale });
  if (isSameMonth(date, today)) return format(date, 'MMMM d', { locale });
  return format(date, 'MMMM yyyy', { locale });
}

function StoreVisitCard({ visit }: { visit: StoreVisitItem }) {
  const { t, dateLocale } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const reviewConfig: Record<string, { icon: React.ReactNode; label: string; bg: string; border: string; text: string; muted: string }> = {
    Approved: { icon: <ThumbsUp className="w-3.5 h-3.5" />, label: t('empVisit.approved'), bg: 'bg-green-50 dark:bg-green-500/10', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-400', muted: 'text-green-600 dark:text-green-500' },
    Rejected: { icon: <ThumbsDown className="w-3.5 h-3.5" />, label: t('empVisit.rejected'), bg: 'bg-red-50 dark:bg-red-500/10', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-400', muted: 'text-red-600 dark:text-red-500' },
  };
  const review = visit.reviewStatus ? reviewConfig[visit.reviewStatus] : null;

  const visitStatusConfig: Record<string, { label: string; bg: string; text: string }> = {
    Completed: { label: t('empVisit.completed'), bg: 'bg-green-100 dark:bg-green-500/20', text: 'text-green-700 dark:text-green-400' },
    InProgress: { label: t('empVisit.inProgress'), bg: 'bg-blue-100 dark:bg-blue-500/20', text: 'text-blue-700 dark:text-blue-400' },
  };
  const visitStatus = visitStatusConfig[visit.status];

  const initials = visit.userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
      <button className="w-full text-left px-4 py-3.5 flex items-start gap-3" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 mt-0.5">
          {visit.userAvatarUrl ? (
            <img src={visit.userAvatarUrl} alt={visit.userName} className="w-9 h-9 object-cover" />
          ) : (
            <div className="w-9 h-9 bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
              <span className="text-xs font-bold text-violet-700 dark:text-violet-400">{initials}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm text-slate-900 dark:text-white leading-tight">{visit.userName}</p>
            {visitStatus && (
              <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${visitStatus.bg} ${visitStatus.text}`}>
                {visitStatus.label}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="w-3 h-3" />
              {format(new Date(visit.checkInTime), 'HH:mm', { locale: dateLocale })}
              {visit.checkOutTime && <> → {format(new Date(visit.checkOutTime), 'HH:mm', { locale: dateLocale })}</>}
            </span>
            {visit.checkOutTime && (
              <span className="text-xs text-slate-400">({formatDurationShort(visit.checkInTime, visit.checkOutTime)})</span>
            )}
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Navigation className="w-3 h-3" />
              {Math.round(visit.distanceFromStore)}{t('empVisit.mFromStore')}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-xs text-slate-500 flex items-center gap-1"><Camera className="w-3 h-3" /> {visit.photosCount} {visit.photosCount !== 1 ? t('empVisit.photos') : t('empVisit.photo')}</span>
            <span className="text-xs text-slate-500 flex items-center gap-1"><Package className="w-3 h-3" /> {visit.productsCount} {visit.productsCount !== 1 ? t('empVisit.products') : t('empVisit.product')}</span>
            {review && (
              <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${review.bg} ${review.border} ${review.text}`}>
                {review.icon} {review.label}
              </span>
            )}
            {!visit.reviewStatus && visit.status === 'Completed' && (
              <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {t('empVisit.awaitingReview')}</span>
            )}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 mt-1 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
      </button>

      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-4 bg-white dark:bg-slate-900 space-y-3">
          {visit.scheduleDueDate && (
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-slate-600 dark:text-slate-400">
                {t('empVisit.scheduledDue')} <span className="font-medium text-slate-900 dark:text-white">{format(new Date(visit.scheduleDueDate), 'EEEE, MMM d, yyyy', { locale: dateLocale })}</span>
              </span>
              {startOfDay(new Date(visit.checkInTime)) <= startOfDay(new Date(visit.scheduleDueDate)) ? (
                <span className="text-xs bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">{t('empVisit.onTime')}</span>
              ) : (
                <span className="text-xs bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">{t('empVisit.late')}</span>
              )}
            </div>
          )}
          {review && (
            <div className={`rounded-xl px-4 py-3 border ${review.bg} ${review.border}`}>
              <div className="flex items-center justify-between">
                <p className={`text-sm font-semibold flex items-center gap-1.5 ${review.text}`}>
                  {review.icon} {review.label} {t('empVisit.by')} {visit.reviewedByAdminName}
                </p>
                <span className={`text-xs ${review.muted}`}>
                  {visit.reviewedAt ? format(new Date(visit.reviewedAt), 'MMM d, HH:mm', { locale: dateLocale }) : ''}
                </span>
              </div>
              {visit.reviewComment && <p className={`text-xs mt-1.5 ${review.muted}`}>"{visit.reviewComment}"</p>}
              {visit.requiresRevisit && <p className={`text-xs font-semibold mt-1 ${review.text}`}>{t('empVisit.revisitRequired')}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function StoreVisitHistoryTab({ storeId }: { storeId: string }) {
  const { t, dateLocale } = useTranslation();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page') ?? '1');
  const setPage = (p: number) => setSearchParams(prev => { prev.set('page', String(p)); return prev; });

  const { data, isLoading } = useQuery({
    queryKey: ['store-visits', storeId, page, statusFilter],
    queryFn: () => api.getStoreVisits(storeId, page, 10, {
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
  });

  const visits = data?.items ?? [];
  const totalPages = data ? Math.ceil(data.totalCount / data.pageSize) : 1;

  const groupedVisits = useMemo(() => {
    const groups: Record<string, StoreVisitItem[]> = {};
    visits.forEach(visit => {
      const label = getDateGroupLabel(visit.checkInTime, t as any, dateLocale);
      if (!groups[label]) groups[label] = [];
      groups[label].push(visit);
    });
    return groups;
  }, [visits, t]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
          {[
            { value: 'all', label: t('empVisit.all') },
            { value: 'Completed', label: t('empVisit.completed') },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === f.value ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {data?.totalCount !== undefined && (
          <span className="text-xs text-slate-500 ml-auto">{data.totalCount} {data.totalCount !== 1 ? t('empVisit.visits') : t('empVisit.visit')}</span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : visits.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">{t('empVisit.noVisitsFound')}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t('empVisit.noVisitsDesc')}</p>
        </div>
      ) : (
        Object.entries(groupedVisits).map(([dateLabel, groupVisits]) => (
          <div key={dateLabel} className="space-y-2">
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{dateLabel}</h3>
              <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
              <span className="text-xs text-slate-400">{groupVisits.length} {groupVisits.length !== 1 ? t('empVisit.visits') : t('empVisit.visit')}</span>
            </div>
            {groupVisits.map(visit => <StoreVisitCard key={visit.id} visit={visit} />)}
          </div>
        ))
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t('empVisit.previous')}</Button>
          <span className="text-sm text-muted-foreground">{t('empVisit.pageOf').replace('{page}', String(page)).replace('{total}', String(totalPages))}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>{t('empVisit.next')}</Button>
        </div>
      )}
    </div>
  );
}
