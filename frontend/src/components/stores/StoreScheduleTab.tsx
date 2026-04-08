import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useTranslation } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DueDateBadge } from '@/components/DueDateBadge';
import {
  Clock, Calendar, CheckCircle, XCircle, AlertTriangle, Ban
} from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import type { StoreScheduleItem } from '@/types';

const scheduleStatusConfig: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  Pending:   { label: 'Pending',   bg: 'bg-amber-100 dark:bg-amber-500/20',  text: 'text-amber-700 dark:text-amber-400',  icon: <Clock className="w-3 h-3" /> },
  Completed: { label: 'Completed', bg: 'bg-green-100 dark:bg-green-500/20',  text: 'text-green-700 dark:text-green-400',  icon: <CheckCircle className="w-3 h-3" /> },
  Missed:    { label: 'Missed',    bg: 'bg-red-100 dark:bg-red-500/20',      text: 'text-red-700 dark:text-red-400',      icon: <XCircle className="w-3 h-3" /> },
  Cancelled: { label: 'Cancelled', bg: 'bg-slate-100 dark:bg-slate-500/20',  text: 'text-slate-500 dark:text-slate-400',  icon: <Ban className="w-3 h-3" /> },
};

function StoreScheduleCard({ schedule }: { schedule: StoreScheduleItem }) {
  const { t, dateLocale } = useTranslation();
  const statusLabels: Record<string, string> = {
    Pending: t('empSched.pending'),
    Completed: t('empSched.completed'),
    Missed: t('empSched.missed'),
    Cancelled: t('empSched.cancelled'),
  };
  const status = scheduleStatusConfig[schedule.status] ?? scheduleStatusConfig.Pending;
  const initials = schedule.employeeName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3.5 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 mt-0.5">
          {schedule.employeeAvatarUrl ? (
            <img src={schedule.employeeAvatarUrl} alt={schedule.employeeName} className="w-9 h-9 object-cover" />
          ) : (
            <div className="w-9 h-9 bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center">
              <span className="text-xs font-bold text-violet-700 dark:text-violet-400">{initials}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm text-slate-900 dark:text-white leading-tight">{schedule.employeeName}</p>
            <span className={`flex-shrink-0 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${status.bg} ${status.text}`}>
              {status.icon} {statusLabels[schedule.status] ?? status.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
            <DueDateBadge dueDate={schedule.dueDate} />
            {schedule.adminNotes && (
              <span className="text-xs text-slate-400 italic truncate max-w-[200px]" title={schedule.adminNotes}>
                📝 {schedule.adminNotes}
              </span>
            )}
          </div>

          {schedule.actualVisitId && schedule.actualVisitCheckInTime && (
            <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                <CheckCircle className="w-3 h-3" />
                {t('empSched.visited').replace('{date}', format(new Date(schedule.actualVisitCheckInTime), 'MMM d, HH:mm', { locale: dateLocale }))}
              </span>
              {startOfDay(new Date(schedule.actualVisitCheckInTime!)) <= startOfDay(new Date(schedule.dueDate)) ? (
                <span className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">{t('empSched.onTime')}</span>
              ) : (
                <span className="bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">{t('empSched.late')}</span>
              )}
            </div>
          )}

          {schedule.status === 'Missed' && !schedule.actualVisitId && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-red-500">
              <AlertTriangle className="w-3 h-3" />
              {t('empSched.missedDesc')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function StoreScheduleTab({ storeId }: { storeId: string }) {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('schedulePage') ?? '1');
  const setPage = (p: number) => setSearchParams(prev => { prev.set('schedulePage', String(p)); return prev; });

  const { data, isLoading } = useQuery({
    queryKey: ['store-schedules', storeId, page, statusFilter],
    queryFn: () => api.getStoreSchedules(storeId, page, 10, {
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
  });

  const schedules = data?.items ?? [];
  const totalPages = data ? Math.ceil(data.totalCount / data.pageSize) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex flex-wrap bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
          {[
            { value: 'all', label: t('empSched.all') },
            { value: 'Pending', label: t('empSched.pending') },
            { value: 'Completed', label: t('empSched.completed') },
            { value: 'Missed', label: t('empSched.missed') },
            { value: 'Cancelled', label: t('empSched.cancelled') },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setPage(1); }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === f.value ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {data?.totalCount !== undefined && (
          <span className="text-xs text-slate-500 ml-auto">{data.totalCount} {data.totalCount !== 1 ? t('empSched.schedules') : t('empSched.schedule')}</span>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">{t('empSched.noSchedulesFound')}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t('empSched.noSchedulesDesc')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {schedules.map(schedule => <StoreScheduleCard key={schedule.id} schedule={schedule} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t('empSched.previous')}</Button>
          <span className="text-sm text-muted-foreground">{t('empSched.pageOf').replace('{page}', String(page)).replace('{total}', String(totalPages))}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>{t('empSched.next')}</Button>
        </div>
      )}
    </div>
  );
}
