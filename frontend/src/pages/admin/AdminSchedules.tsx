import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Calendar, LayoutList, ChevronLeft, ChevronRight,
  CheckCircle2, Clock, XCircle, Ban, X, User,
  Store, CalendarDays, StickyNote, UserCog, AlertTriangle,
  CalendarClock, MapPin, ExternalLink
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, addWeeks, eachDayOfInterval, isSameDay, isPast, isToday, differenceInDays, startOfDay } from 'date-fns';
import { RegionSelect } from '@/components/RegionSelect';
import { RegionBadge } from '@/components/RegionBadge';
import { useTranslation } from '@/i18n';
import type { VisitSchedule } from '@/types';

/* ─── Status config ─── */
const statusConfig: Record<string, { icon: React.ReactNode; color: string; bg: string; border: string; dot: string }> = {
  Pending:   { icon: <Clock className="h-3.5 w-3.5" />,        color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-500/10',   border: 'border-amber-200 dark:border-amber-500/20', dot: 'bg-amber-500' },
  Completed: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-500/10',   border: 'border-green-200 dark:border-green-500/20', dot: 'bg-green-500' },
  Missed:    { icon: <XCircle className="h-3.5 w-3.5" />,      color: 'text-red-600 dark:text-red-400',      bg: 'bg-red-50 dark:bg-red-500/10',       border: 'border-red-200 dark:border-red-500/20', dot: 'bg-red-500' },
  Cancelled: { icon: <Ban className="h-3.5 w-3.5" />,          color: 'text-slate-500 dark:text-slate-400',  bg: 'bg-slate-50 dark:bg-slate-500/10',   border: 'border-slate-200 dark:border-slate-500/20', dot: 'bg-slate-400' },
};

/* ─── Urgency helper for pending schedules ─── */
function getUrgency(dueDate: string) {
  const diff = differenceInDays(startOfDay(new Date(dueDate)), startOfDay(new Date()));
  if (diff < 0) return { label: 'Overdue', className: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10' };
  if (diff === 0) return { label: 'Due Today', className: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10' };
  if (diff <= 3) return { label: `${diff}d left`, className: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10' };
  return null;
}

export default function AdminSchedules() {
  const { t, dateLocale } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeView = searchParams.get('view') ?? 'list';
  const statusFilter = searchParams.get('status') ?? '';
  const [regionFilter, setRegionFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  /* calendar week nav */
  const [weekOffset, setWeekOffset] = useState(0);
  const currentWeekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });

  const [detailSchedule, setDetailSchedule] = useState<VisitSchedule | null>(null);

  /* ─── Data ─── */
  const { data: scheduleData, isLoading } = useQuery({
    queryKey: ['schedules', page, statusFilter, regionFilter, employeeFilter, activeView === 'calendar' ? format(currentWeekStart, 'yyyy-MM-dd') : ''],
    queryFn: () => api.getSchedules(page, 50, {
      status: statusFilter || undefined,
      regionId: regionFilter !== 'all' ? regionFilter : undefined,
      employeeId: employeeFilter || undefined,
      from: activeView === 'calendar' ? format(currentWeekStart, 'yyyy-MM-dd') : undefined,
      to: activeView === 'calendar' ? format(currentWeekEnd, 'yyyy-MM-dd') : undefined,
    })
  });

  const { data: employees } = useQuery({
    queryKey: ['allUsers', 'Employee', regionFilter],
    queryFn: () => api.getAllUsers(1, 200, 'Employee', undefined, regionFilter !== 'all' ? regionFilter : undefined)
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.cancelSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setDetailSchedule(null);
    }
  });

  /* ─── Computed ─── */
  const items = scheduleData?.items ?? [];
  const totalPages = scheduleData ? Math.ceil(scheduleData.totalCount / 50) : 0;

  const stats = useMemo(() => {
    const all = items;
    return {
      total: scheduleData?.totalCount ?? 0,
      pending: all.filter(s => s.status === 'Pending').length,
      completed: all.filter(s => s.status === 'Completed').length,
      missed: all.filter(s => s.status === 'Missed').length,
      overdue: all.filter(s => s.status === 'Pending' && isPast(new Date(s.dueDate)) && !isToday(new Date(s.dueDate))).length,
    };
  }, [items, scheduleData]);

  /* Calendar grouping */
  const calendarData = useMemo(() => {
    const map = new Map<string, { employee: string; schedules: VisitSchedule[] }>();
    for (const s of items) {
      if (!map.has(s.employeeId)) map.set(s.employeeId, { employee: s.employeeName, schedules: [] });
      map.get(s.employeeId)!.schedules.push(s);
    }
    return map;
  }, [items]);

  /* ─── Helpers ─── */
  const setView = (v: string) => setSearchParams(prev => { prev.set('view', v); return prev; });
  const setStatus = (s: string) => { setSearchParams(prev => { if (s) prev.set('status', s); else prev.delete('status'); return prev; }); setPage(1); };

  /* ─── Stat cards config ─── */
  const statCards = [
    { label: t('adminSched.totalSchedules' as any), value: stats.total, icon: <CalendarDays className="h-5 w-5" />, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { label: t('common.pending'), value: stats.pending, icon: <Clock className="h-5 w-5" />, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { label: t('common.completed'), value: stats.completed, icon: <CheckCircle2 className="h-5 w-5" />, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10' },
    { label: t('adminSched.overdue' as any), value: stats.overdue, icon: <AlertTriangle className="h-5 w-5" />, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' },
  ];

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarClock className="h-7 w-7 text-violet-600 dark:text-violet-400" />
            {t('adminSched.visitSchedules' as any)}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t('adminSched.subtitle')}</p>
        </div>
        {/* View toggle */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 self-start">
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeView === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <LayoutList className="h-4 w-4" /> {t('adminSched.list')}
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeView === 'calendar' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <Calendar className="h-4 w-4" /> {t('adminSched.calendar')}
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${card.bg}`}>
                <span className={card.color}>{card.icon}</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{card.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Filters ── */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-44">
              <RegionSelect value={regionFilter} onChange={setRegionFilter} includeAll />
            </div>
            <select
              className="h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              value={employeeFilter}
              onChange={e => { setEmployeeFilter(e.target.value); setPage(1); }}
            >
              <option value="">{t('adminSched.allEmployees' as any)}</option>
              {employees?.items.map(e => <option key={e.id} value={e.id}>{e.fullName}</option>)}
            </select>

            <div className="flex items-center gap-1 flex-wrap">
              {[
                { key: '', label: t('common.all') },
                { key: 'Pending', label: t('common.pending') },
                { key: 'Completed', label: t('common.completed') },
                { key: 'Missed', label: t('common.missed') },
                { key: 'Cancelled', label: t('common.cancelled') },
              ].map(s => (
                <button
                  key={s.key}
                  onClick={() => setStatus(s.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    statusFilter === s.key
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════ LIST VIEW ═══════════════ */}
      {activeView === 'list' && (
        <>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
          ) : items.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <CalendarDays className="h-7 w-7 text-slate-400" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium">{t('adminSched.noSchedules')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {items.map(s => {
                const cfg = statusConfig[s.status];
                const urgency = s.status === 'Pending' ? getUrgency(s.dueDate) : null;
                return (
                  <Card key={s.id}
                    className={`border shadow-sm hover:shadow-md transition-all cursor-pointer group ${cfg.border}`}
                    onClick={() => setDetailSchedule(s)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Left — status dot + line */}
                        <div className="flex flex-col items-center pt-0.5">
                          <div className={`w-3 h-3 rounded-full ${cfg.dot} ring-4 ring-white dark:ring-slate-900`} />
                          <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1 min-h-[20px]" />
                        </div>

                        {/* Main content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color} ${cfg.bg}`}>
                              {cfg.icon} {t(('common.' + s.status.toLowerCase()) as any)}
                            </span>
                            {urgency && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${urgency.className}`}>
                                {urgency.label}
                              </span>
                            )}
                            <span className="text-xs text-slate-400 dark:text-slate-500">
                              {format(new Date(s.dueDate), 'MMM d, yyyy', { locale: dateLocale })}
                              {s.dueTime && ` · ${s.dueTime.substring(0, 5)}`}
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                            <div className="flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{s.employeeName}</span>
                            </div>
                            <span className="hidden sm:block text-slate-300 dark:text-slate-600">→</span>
                            <div className="flex items-center gap-1.5">
                              <Store className="h-3.5 w-3.5 text-slate-400" />
                              <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{s.storeName}</span>
                            </div>
                            {s.storeRegionId && (
                              <RegionBadge regionId={s.storeRegionId} />
                            )}
                          </div>

                          {s.adminNotes && (
                            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1">
                              <StickyNote className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-1">{s.adminNotes}</span>
                            </p>
                          )}
                        </div>

                        {/* Right — actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {s.status === 'Pending' && (
                            <Button
                              variant="ghost" size="sm"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                              onClick={(e) => { e.stopPropagation(); cancelMutation.mutate(s.id); }}
                              title={t('adminSched.cancelSchedule')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded-lg">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-slate-500 dark:text-slate-400 font-medium tabular-nums">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded-lg">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* ═══════════════ CALENDAR VIEW ═══════════════ */}
      {activeView === 'calendar' && (
        <>
          {/* Week nav */}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setWeekOffset(o => o - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> {t('adminSched.prev' as any)}
            </Button>
            <div className="text-center">
              <span className="font-semibold text-sm text-slate-900 dark:text-white">
                {format(currentWeekStart, 'MMM d', { locale: dateLocale })} — {format(currentWeekEnd, 'MMM d, yyyy', { locale: dateLocale })}
              </span>
              {weekOffset !== 0 && (
                <button onClick={() => setWeekOffset(0)} className="ml-2 text-xs text-violet-600 hover:text-violet-700 dark:text-violet-400 font-medium">
                  {t('adminSched.thisWeek')}
                </button>
              )}
            </div>
            <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setWeekOffset(o => o + 1)}>
              {t('common.next')} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {isLoading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : calendarData.size === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-16 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                  <Calendar className="h-7 w-7 text-slate-400" />
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium">{t('adminSched.noSchedulesThisWeek' as any)}</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[700px]">
                    <thead>
                      <tr className="border-b bg-slate-50/80 dark:bg-slate-800/50">
                        <th className="p-3 text-left font-medium text-slate-500 dark:text-slate-400 w-40 sticky left-0 bg-slate-50/80 dark:bg-slate-800/50 z-10">
                          {t('common.employee')}
                        </th>
                        {weekDays.map(day => {
                          const today = isToday(day);
                          return (
                            <th key={day.toISOString()} className={`p-3 text-center min-w-[100px] ${today ? 'bg-violet-50/50 dark:bg-violet-500/5' : ''}`}>
                              <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium">
                                {format(day, 'EEE', { locale: dateLocale })}
                              </div>
                              <div className={`mt-0.5 text-sm font-semibold ${today ? 'text-violet-600 dark:text-violet-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                {format(day, 'd')}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from(calendarData.entries()).map(([empId, { employee, schedules }]) => (
                        <tr key={empId} className="border-b last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-3 sticky left-0 bg-white dark:bg-slate-900 z-10">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                                {employee.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-[110px]">{employee}</span>
                            </div>
                          </td>
                          {weekDays.map(day => {
                            const daySchedules = schedules.filter(s => isSameDay(new Date(s.dueDate), day));
                            const today = isToday(day);
                            return (
                              <td key={day.toISOString()} className={`p-1.5 align-top ${today ? 'bg-violet-50/30 dark:bg-violet-500/5' : ''}`}>
                                {daySchedules.map(s => {
                                  const cfg = statusConfig[s.status];
                                  return (
                                    <button key={s.id} onClick={() => setDetailSchedule(s)}
                                      className={`block w-full mb-1 px-2 py-1.5 rounded-lg text-[11px] font-medium truncate border transition-all hover:shadow-sm ${cfg.color} ${cfg.bg} ${cfg.border}`}
                                      title={`${s.storeName} — ${s.status}`}
                                    >
                                      <div className="flex items-center gap-1">
                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                                        <span className="truncate">{s.storeName.length > 15 ? s.storeName.substring(0, 15) + '…' : s.storeName}</span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ═══════════════ DETAIL MODAL ═══════════════ */}
      <Dialog open={!!detailSchedule} onOpenChange={() => setDetailSchedule(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden">
          {detailSchedule && (() => {
            const cfg = statusConfig[detailSchedule.status];
            const urgency = detailSchedule.status === 'Pending' ? getUrgency(detailSchedule.dueDate) : null;
            return (
              <>
                {/* Header banner */}
                <div className={`px-6 pt-6 pb-4 ${cfg.bg}`}>
                  <DialogHeader>
                    <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                      {t('adminSched.scheduleDetail' as any)}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex items-center gap-2 mt-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.color} bg-white/60 dark:bg-slate-900/30`}>
                      {cfg.icon} {t(('common.' + detailSchedule.status.toLowerCase()) as any)}
                    </span>
                    {urgency && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${urgency.className}`}>
                        {urgency.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                  {/* Date */}
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                      <CalendarDays className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('adminSched.deadline' as any)}</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {format(new Date(detailSchedule.dueDate), 'EEEE, MMMM d, yyyy', { locale: dateLocale })}
                        {detailSchedule.dueTime && <span className="text-slate-500 dark:text-slate-400 font-normal"> · {detailSchedule.dueTime.substring(0, 5)}</span>}
                      </p>
                    </div>
                  </div>

                  {/* Employee */}
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('common.employee')}</p>
                      <button
                        className="text-sm font-semibold text-slate-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 transition-colors flex items-center gap-1"
                        onClick={() => { setDetailSchedule(null); navigate(`/admin/employees/${detailSchedule.employeeId}`); }}
                      >
                        {detailSchedule.employeeName}
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Store */}
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('common.store')}</p>
                      <button
                        className="text-sm font-semibold text-slate-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 transition-colors flex items-center gap-1"
                        onClick={() => { setDetailSchedule(null); navigate(`/admin/stores/${detailSchedule.storeId}`); }}
                      >
                        {detailSchedule.storeName}
                        <ExternalLink className="h-3 w-3" />
                      </button>
                      {detailSchedule.storeRegionId && <RegionBadge regionId={detailSchedule.storeRegionId} className="mt-1" />}
                    </div>
                  </div>

                  {/* Notes */}
                  {detailSchedule.adminNotes && (
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <StickyNote className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('adminSched.notes' as any)}</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{detailSchedule.adminNotes}</p>
                      </div>
                    </div>
                  )}

                  {/* Created by */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                      <UserCog className="h-3 w-3" />
                      {t('adminSched.createdBy' as any)} <span className="font-medium text-slate-500 dark:text-slate-400">{detailSchedule.createdByAdminName}</span>
                      <span>· {format(new Date(detailSchedule.createdAt), 'MMM d, yyyy', { locale: dateLocale })}</span>
                    </div>
                  </div>

                  {/* Cancel action */}
                  {detailSchedule.status === 'Pending' && (
                    <div className="pt-3 flex justify-end">
                      <Button
                        variant="destructive" size="sm"
                        className="rounded-lg"
                        onClick={() => cancelMutation.mutate(detailSchedule.id)}
                        disabled={cancelMutation.isPending}
                      >
                        <Ban className="h-3.5 w-3.5 mr-1.5" />
                        {t('adminSched.cancelSchedule')}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
