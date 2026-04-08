import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronLeft, ChevronRight, ChevronDown, Shield,
  LogIn, LogOut, MapPin, CheckCircle, XCircle, Clock,
  CalendarPlus, CalendarX, AlertTriangle, Store, UserCheck,
  UserX, UserCog, Trash2, Link2, Unlink, Calendar, Filter, X, Search
} from 'lucide-react';
import { format, startOfDay, isSameDay, differenceInDays, isSameMonth } from 'date-fns';
import { RegionSelect } from '@/components/RegionSelect';
import { RegionBadge } from '@/components/RegionBadge';
import { useTranslation } from '@/i18n';
import type { AuditLog } from '@/types';

/* ── Action config: icon + colors ── */
const actionConfig: Record<string, { icon: React.ReactNode; bg: string; dot: string; text: string }> = {
  Login:             { icon: <LogIn className="w-3.5 h-3.5" />,       bg: 'bg-blue-50 dark:bg-blue-500/10',    dot: 'bg-blue-500',    text: 'text-blue-700 dark:text-blue-400' },
  Logout:            { icon: <LogOut className="w-3.5 h-3.5" />,      bg: 'bg-slate-50 dark:bg-slate-500/10',  dot: 'bg-slate-400',   text: 'text-slate-600 dark:text-slate-400' },
  CheckIn:           { icon: <MapPin className="w-3.5 h-3.5" />,      bg: 'bg-green-50 dark:bg-green-500/10',  dot: 'bg-green-500',   text: 'text-green-700 dark:text-green-400' },
  CheckOut:          { icon: <CheckCircle className="w-3.5 h-3.5" />, bg: 'bg-emerald-50 dark:bg-emerald-500/10', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400' },
  VisitApproved:     { icon: <CheckCircle className="w-3.5 h-3.5" />, bg: 'bg-green-50 dark:bg-green-500/10',  dot: 'bg-green-500',   text: 'text-green-700 dark:text-green-400' },
  VisitRejected:     { icon: <XCircle className="w-3.5 h-3.5" />,     bg: 'bg-red-50 dark:bg-red-500/10',      dot: 'bg-red-500',     text: 'text-red-700 dark:text-red-400' },
  ScheduleCreated:   { icon: <CalendarPlus className="w-3.5 h-3.5" />,bg: 'bg-violet-50 dark:bg-violet-500/10',dot: 'bg-violet-500',  text: 'text-violet-700 dark:text-violet-400' },
  ScheduleCancelled: { icon: <CalendarX className="w-3.5 h-3.5" />,   bg: 'bg-amber-50 dark:bg-amber-500/10',  dot: 'bg-amber-500',   text: 'text-amber-700 dark:text-amber-400' },
  ScheduleMissed:    { icon: <AlertTriangle className="w-3.5 h-3.5" />,bg: 'bg-orange-50 dark:bg-orange-500/10',dot: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-400' },
  StoreCreated:      { icon: <Store className="w-3.5 h-3.5" />,       bg: 'bg-teal-50 dark:bg-teal-500/10',    dot: 'bg-teal-500',    text: 'text-teal-700 dark:text-teal-400' },
  StoreUpdated:      { icon: <Store className="w-3.5 h-3.5" />,       bg: 'bg-cyan-50 dark:bg-cyan-500/10',    dot: 'bg-cyan-500',    text: 'text-cyan-700 dark:text-cyan-400' },
  StoreDeleted:      { icon: <Trash2 className="w-3.5 h-3.5" />,      bg: 'bg-red-50 dark:bg-red-500/10',      dot: 'bg-red-500',     text: 'text-red-700 dark:text-red-400' },
  UserApproved:      { icon: <UserCheck className="w-3.5 h-3.5" />,   bg: 'bg-green-50 dark:bg-green-500/10',  dot: 'bg-green-500',   text: 'text-green-700 dark:text-green-400' },
  UserRejected:      { icon: <UserX className="w-3.5 h-3.5" />,       bg: 'bg-red-50 dark:bg-red-500/10',      dot: 'bg-red-500',     text: 'text-red-700 dark:text-red-400' },
  UserUpdated:       { icon: <UserCog className="w-3.5 h-3.5" />,     bg: 'bg-indigo-50 dark:bg-indigo-500/10',dot: 'bg-indigo-500',  text: 'text-indigo-700 dark:text-indigo-400' },
  UserDeleted:       { icon: <Trash2 className="w-3.5 h-3.5" />,      bg: 'bg-red-50 dark:bg-red-500/10',      dot: 'bg-red-500',     text: 'text-red-700 dark:text-red-400' },
  AssignStore:       { icon: <Link2 className="w-3.5 h-3.5" />,       bg: 'bg-purple-50 dark:bg-purple-500/10',dot: 'bg-purple-500',  text: 'text-purple-700 dark:text-purple-400' },
  UnassignStore:     { icon: <Unlink className="w-3.5 h-3.5" />,      bg: 'bg-slate-50 dark:bg-slate-500/10',  dot: 'bg-slate-400',   text: 'text-slate-600 dark:text-slate-400' },
};

const defaultConfig = { icon: <Shield className="w-3.5 h-3.5" />, bg: 'bg-slate-50 dark:bg-slate-500/10', dot: 'bg-slate-400', text: 'text-slate-600 dark:text-slate-400' };

function getDateGroupLabel(dateStr: string, t: (key: string) => string, locale?: any): string {
  const date = new Date(dateStr);
  const today = startOfDay(new Date());
  const diff = differenceInDays(today, startOfDay(date));
  if (diff === 0) return t('empVisit.today');
  if (diff === 1) return t('empVisit.yesterday');
  if (diff <= 7) return format(date, 'EEEE, MMM d', { locale });
  if (isSameMonth(date, today)) return format(date, 'MMMM d', { locale });
  return format(date, 'MMMM d, yyyy', { locale });
}

/* ── Single Audit Card ── */
function AuditCard({ log, t, dateLocale }: { log: AuditLog; t: (k: string) => string; dateLocale?: any }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = actionConfig[log.action] ?? defaultConfig;
  const hasDetails = !!(log.oldValues || log.newValues);

  return (
    <div className="group relative flex gap-3">
      {/* Timeline dot */}
      <div className="flex flex-col items-center pt-1">
        <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot} ring-4 ring-white dark:ring-slate-900 flex-shrink-0`} />
        <div className="w-px flex-1 bg-slate-200 dark:bg-slate-700 mt-1" />
      </div>

      {/* Card */}
      <div
        className={`flex-1 mb-3 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors ${
          hasDetails ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-600' : ''
        }`}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <div className="px-3.5 py-3 sm:px-4 sm:py-3">
          {/* Top row: action badge + time */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
              {cfg.icon}
              {t(('audit.action.' + log.action) as any) || log.action}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
              {format(new Date(log.timestamp), 'HH:mm:ss', { locale: dateLocale })}
            </span>
          </div>

          {/* Main content line */}
          <div className="flex flex-wrap items-center gap-x-1 text-sm leading-snug">
            <span className="font-medium text-slate-900 dark:text-white">
              {log.userName || t('adminAudit.system' as any)}
            </span>
            {log.entityName && (
              <>
                <span className="text-slate-400">→</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">{log.entityName}</span>
              </>
            )}
          </div>

          {/* Description */}
          {log.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{log.description}</p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
            {log.regionId && <RegionBadge regionId={log.regionId} />}
            {hasDetails && (
              <button className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors ml-auto">
                {t('adminAudit.details')}
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Expanded Details */}
        {expanded && hasDetails && (
          <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3.5 py-3 sm:px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {log.oldValues && (
                <div>
                  <p className="font-semibold text-slate-500 mb-1">{t('adminAudit.oldValues' as any)}</p>
                  <pre className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] overflow-x-auto max-h-32 text-slate-600 dark:text-slate-400">{log.oldValues}</pre>
                </div>
              )}
              {log.newValues && (
                <div>
                  <p className="font-semibold text-slate-500 mb-1">{t('adminAudit.newValues' as any)}</p>
                  <pre className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] overflow-x-auto max-h-32 text-slate-600 dark:text-slate-400">{log.newValues}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function AdminAudit() {
  const { t, dateLocale } = useTranslation();
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [regionId, setRegionId] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const PAGE_SIZE = 25;

  const hasActiveFilters = entityType !== '' || regionId !== 'all' || fromDate !== '' || toDate !== '';

  const { data, isLoading } = useQuery({
    queryKey: ['auditLogs', page, entityType, regionId, fromDate, toDate],
    queryFn: () => api.getAuditLogs(page, PAGE_SIZE, {
      entityType: entityType || undefined,
      regionId: regionId !== 'all' ? regionId : undefined,
      from: fromDate || undefined,
      to: toDate ? toDate + 'T23:59:59' : undefined,
    })
  });

  const totalPages = data ? Math.ceil(data.totalCount / PAGE_SIZE) : 0;

  const clearFilters = () => {
    setEntityType('');
    setRegionId('all');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  /* Group logs by date */
  const grouped = useMemo(() => {
    if (!data?.items) return {};
    const groups: Record<string, AuditLog[]> = {};
    data.items.forEach(log => {
      const label = getDateGroupLabel(log.timestamp, t as any, dateLocale);
      if (!groups[label]) groups[label] = [];
      groups[label].push(log);
    });
    return groups;
  }, [data?.items, t, dateLocale]);

  /* Entity type pills */
  const entityPills = [
    { value: '', label: t('empVisit.all') },
    { value: 'Visit', label: t('audit.filterVisit' as any) },
    { value: 'Store', label: t('audit.filterStore' as any) },
    { value: 'User', label: t('audit.filterUser' as any) },
    { value: 'Schedule', label: t('audit.filterSchedule' as any) },
    { value: 'Auth', label: t('audit.filterAuth' as any) },
  ];

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Shield className="w-4.5 h-4.5 text-primary" />
            </div>
            {t('adminAudit.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('adminAudit.subtitle')}
            {data && <span className="text-slate-400"> · {data.totalCount.toLocaleString()} {t('adminAudit.entries' as any)}</span>}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 self-start ${hasActiveFilters ? 'border-primary text-primary' : ''}`}
        >
          <Filter className="w-3.5 h-3.5" />
          {t('audit.filters' as any)}
          {hasActiveFilters && (
            <span className="w-4.5 h-4.5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">!</span>
          )}
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Entity type pills */}
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">{t('adminAudit.entity')}</p>
            <div className="flex flex-wrap gap-1.5">
              {entityPills.map(p => (
                <button
                  key={p.value}
                  onClick={() => { setEntityType(p.value); setPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    entityType === p.value
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date range + Region */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{t('audit.fromDate' as any)}</p>
              <Input
                type="date"
                value={fromDate}
                onChange={e => { setFromDate(e.target.value); setPage(1); }}
                className="text-sm h-9"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{t('audit.toDate' as any)}</p>
              <Input
                type="date"
                value={toDate}
                onChange={e => { setToDate(e.target.value); setPage(1); }}
                className="text-sm h-9"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">{t('common.region')}</p>
              <RegionSelect value={regionId} onChange={v => { setRegionId(v); setPage(1); }} includeAll />
            </div>
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
            >
              <X className="w-3 h-3" />
              {t('audit.clearFilters' as any)}
            </button>
          )}
        </div>
      )}

      {/* Active filter badges (collapsed summary) */}
      {!showFilters && hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {entityType && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
              {t(('audit.entity.' + entityType) as any) || entityType}
              <button onClick={() => { setEntityType(''); setPage(1); }}><X className="w-3 h-3" /></button>
            </span>
          )}
          {fromDate && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-medium">
              {t('audit.from' as any)} {fromDate}
              <button onClick={() => { setFromDate(''); setPage(1); }}><X className="w-3 h-3" /></button>
            </span>
          )}
          {toDate && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-medium">
              {t('audit.to' as any)} {toDate}
              <button onClick={() => { setFromDate(''); setPage(1); }}><X className="w-3 h-3" /></button>
            </span>
          )}
          {regionId !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs">
              <RegionBadge regionId={regionId} />
              <button onClick={() => { setRegionId('all'); setPage(1); }}><X className="w-3 h-3 text-slate-400" /></button>
            </span>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex gap-3">
              <Skeleton className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1" />
              <Skeleton className="flex-1 h-20 rounded-xl" />
            </div>
          ))}
        </div>
      ) : !data?.items.length ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <Search className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('adminAudit.noLogs')}</p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-xs text-primary hover:underline mt-2 font-medium">
              {t('audit.clearFilters' as any)}
            </button>
          )}
        </div>
      ) : (
        <div>
          {Object.entries(grouped).map(([dateLabel, logs]) => (
            <div key={dateLabel}>
              {/* Date group header */}
              <div className="flex items-center gap-2.5 mb-3 mt-1">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{dateLabel}</span>
                </div>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <span className="text-[11px] text-slate-400">{logs.length}</span>
              </div>

              {/* Timeline cards */}
              {logs.map(log => (
                <AuditCard key={log.id} log={log} t={t as any} dateLocale={dateLocale} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="h-8 px-3">
            <ChevronLeft className="h-3.5 w-3.5 mr-1" />
            {t('empSched.previous')}
          </Button>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium tabular-nums">
            {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-8 px-3">
            {t('empSched.next')}
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
