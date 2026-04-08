import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, MapPin, CheckCircle2, XCircle, AlertTriangle, CalendarClock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isPast } from 'date-fns';
import { DueDateBadge } from '@/components/DueDateBadge';
import { getDueDateInfo } from '@/utils/dueDateLabel';
import { useTranslation } from '@/i18n';

const statusConfig: Record<string, { variant: 'success' | 'warning' | 'destructive' | 'secondary'; icon: React.ReactNode }> = {
  Pending:   { variant: 'warning',     icon: <Clock className="h-3 w-3" /> },
  Completed: { variant: 'success',     icon: <CheckCircle2 className="h-3 w-3" /> },
  Missed:    { variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
  Cancelled: { variant: 'secondary',   icon: <AlertTriangle className="h-3 w-3" /> },
};

export default function MySchedules() {
  const navigate = useNavigate();
  const { t, dateLocale } = useTranslation();

  const { data: allSchedules, isLoading } = useQuery({
    queryKey: ['mySchedules'],
    queryFn: () => api.getMySchedules()
  });

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>;
  }

  const schedules = allSchedules ?? [];

  // Group schedules
  const overdue = schedules.filter(s => s.status === 'Pending' && isPast(new Date(s.dueDate)) && !isToday(new Date(s.dueDate)));
  const today = schedules.filter(s => s.status === 'Pending' && isToday(new Date(s.dueDate)));
  const upcoming = schedules.filter(s => s.status === 'Pending' && !isPast(new Date(s.dueDate)) && !isToday(new Date(s.dueDate)));
  const completed = schedules.filter(s => s.status === 'Completed');
  const missedOrCancelled = schedules.filter(s => s.status === 'Missed' || s.status === 'Cancelled');

  const pendingCount = overdue.length + today.length + upcoming.length;

  const renderScheduleCard = (s: typeof schedules[0]) => {
    const cfg = statusConfig[s.status];
    return (
      <Card key={s.id} className="hover:shadow-sm transition-shadow">
        <CardContent className="flex items-center gap-3 py-3">
          <div className={`p-2.5 rounded-xl flex-shrink-0 ${
            s.status === 'Completed' ? 'bg-green-100 dark:bg-green-500/20' :
            s.status === 'Missed' ? 'bg-red-100 dark:bg-red-500/20' :
            s.status === 'Cancelled' ? 'bg-slate-100 dark:bg-slate-700' :
            'bg-amber-100 dark:bg-amber-500/20'
          }`}>
            <MapPin className={`h-4 w-4 ${
              s.status === 'Completed' ? 'text-green-600' :
              s.status === 'Missed' ? 'text-red-600' :
              s.status === 'Cancelled' ? 'text-slate-400' :
              'text-amber-600'
            }`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm">{s.storeName}</p>
              {s.status === 'Pending' && <DueDateBadge dueDate={s.dueDate} />}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {s.adminNotes || format(new Date(s.dueDate), 'EEEE, MMMM d, yyyy', { locale: dateLocale })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant={cfg.variant} className="gap-1 text-[10px]">{cfg.icon} {t(('common.' + s.status.toLowerCase()) as any) || s.status}</Badge>
            {s.status === 'Pending' && (
              <Button size="sm" className="h-7 text-xs" onClick={() => navigate(`/store/${s.storeId}`)}>Go</Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('mySchedules.title')}</h1>
          <p className="text-slate-500">{pendingCount} pending · {completed.length} completed · {schedules.length} total</p>
        </div>
      </div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Overdue ({overdue.length})
          </h2>
          {overdue.map(renderScheduleCard)}
        </div>
      )}

      {/* Today */}
      {today.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-amber-600 flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Due Today ({today.length})
          </h2>
          {today.map(renderScheduleCard)}
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-blue-600 flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> Upcoming ({upcoming.length})
          </h2>
          {upcoming
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .map(renderScheduleCard)}
        </div>
      )}

      {/* Empty state */}
      {pendingCount === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-3" />
            <p className="font-medium text-slate-700 dark:text-slate-300">All caught up!</p>
            <p className="text-sm text-muted-foreground">No pending schedules right now.</p>
          </CardContent>
        </Card>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-green-600 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Completed ({completed.length})
          </h2>
          {completed.slice(0, 10).map(renderScheduleCard)}
          {completed.length > 10 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              + {completed.length - 10} more completed visits
            </p>
          )}
        </div>
      )}

      {/* Missed / Cancelled */}
      {missedOrCancelled.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <XCircle className="h-4 w-4" /> Missed / Cancelled ({missedOrCancelled.length})
          </h2>
          {missedOrCancelled.map(renderScheduleCard)}
        </div>
      )}
    </div>
  );
}
