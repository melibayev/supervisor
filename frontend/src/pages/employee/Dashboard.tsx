import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Clock, CheckCircle2, Navigation, Calendar, XCircle, AlertTriangle, CalendarClock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { RegionBadge } from '@/components/RegionBadge';
import { DueDateBadge } from '@/components/DueDateBadge';
import { getDueDateInfo } from '@/utils/dueDateLabel';
import { useTranslation } from '@/i18n';

export default function EmployeeDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t, dateLocale } = useTranslation();

  const { data: activeVisit, isLoading: loadingVisit } = useQuery({
    queryKey: ['activeVisit'],
    queryFn: () => api.getActiveVisit(),
    refetchInterval: 30000
  });

  const { data: myStores, isLoading: loadingStores } = useQuery({
    queryKey: ['myStores'],
    queryFn: () => api.getMyStores()
  });

  const { data: history } = useQuery({
    queryKey: ['myVisits', 1],
    queryFn: () => api.getMyVisits(1, 5)
  });

  const { data: todaySchedules } = useQuery({
    queryKey: ['myTodaySchedules'],
    queryFn: () => api.getMyTodaySchedules(),
    refetchInterval: 60000
  });

  const { data: allSchedules } = useQuery({
    queryKey: ['mySchedules'],
    queryFn: () => api.getMySchedules()
  });

  if (loadingVisit || loadingStores) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  const todayVisits = history?.items.filter(v =>
    new Date(v.checkInTime).toDateString() === new Date().toDateString()
  ).length ?? 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('empDash.welcome')}, {user?.fullName?.split(' ')[0]}</h1>
        <div className="flex items-center gap-2">
          <p className="text-slate-500 dark:text-slate-400">{t('empDash.todayOverview')}{activeVisit ? ` — ${t('empDash.activeVisitAt')}` : ''}</p>
          <RegionBadge regionId={user?.regionId} />
        </div>
      </div>

      {/* Active Visit Alert */}
      {activeVisit && (
        <Card className="border-primary bg-red-50">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-3 bg-primary rounded-full animate-pulse-dot">
              <Navigation className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-secondary-900">{t('empDash.activeVisit')}: {activeVisit.storeName}</p>
              <p className="text-sm text-secondary-500">
                {t('empDash.startedAt')} {format(new Date(activeVisit.checkInTime), 'h:mm a', { locale: dateLocale })} · {activeVisit.distanceFromStore.toFixed(0)}m {t('empDash.fromStore')}
              </p>
            </div>
            <Button onClick={() => navigate('/visit/' + activeVisit.id)}>
              {t('empDash.continueVisit')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Deadlines */}
      {(() => {
        const assignedStoreIds = new Set((myStores ?? []).map(s => s.id));
        const pendingSchedules = (allSchedules ?? [])
          .filter(s => s.status === 'Pending' && assignedStoreIds.has(s.storeId))
          .map(s => ({ ...s, _due: getDueDateInfo(s.dueDate) }))
          .sort((a, b) => a._due.sortKey - b._due.sortKey || new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

        return pendingSchedules.length > 0 ? (
          <Card className="border-amber-200 dark:border-amber-800">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-amber-600" />
                  <h3 className="font-semibold text-sm">{t('empDash.upcomingDeadlines')}</h3>
                </div>
                <Badge variant="warning" className="text-xs">
                  {pendingSchedules.length} {t('empDash.pendingCount')}
                </Badge>
              </div>
              <div className="space-y-2">
                {pendingSchedules.slice(0, 5).map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{s.storeName}</span>
                      <DueDateBadge dueDate={s.dueDate} />
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs flex-shrink-0" onClick={() => navigate(`/store/${s.storeId}`)}>{t('empDash.go')}</Button>
                  </div>
                ))}
                {pendingSchedules.length > 5 && (
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => navigate('/schedules')}>
                    {t('empDash.viewAllScheduled')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : null;
      })()}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="p-3 bg-blue-100 rounded-xl">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{myStores?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">{t('empDash.assignedStores')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{todayVisits}</p>
              <p className="text-sm text-muted-foreground">{t('empDash.visitsToday')}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{history?.totalCount ?? 0}</p>
              <p className="text-sm text-muted-foreground">{t('empDash.totalVisits')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* My Stores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('empDash.yourStores')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {myStores?.map(store => (
            <div key={store.id} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">{store.name}</p>
                  <p className="text-xs text-muted-foreground">{store.address}, {store.city}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/store/${store.id}`)}
              >
                {t('empDash.viewStore')}
              </Button>
            </div>
          ))}
          {!myStores?.length && (
            <p className="text-center text-muted-foreground py-6">{t('empDash.noStores')}</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Visits */}
      {(history?.items.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{t('empDash.recentVisits')}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/history')}>{t('common.viewAll')}</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {history?.items.slice(0, 5).map(visit => (
              <div key={visit.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary-50 cursor-pointer" onClick={() => navigate(`/visit/${visit.id}`)}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    visit.status === 'Completed' ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    {visit.status === 'Completed' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                     <Clock className="h-4 w-4 text-yellow-600" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{visit.storeName}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(visit.checkInTime), 'MMM d, h:mm a', { locale: dateLocale })}</p>
                  </div>
                </div>
                <Badge variant={visit.status === 'Completed' ? 'success' : 'warning'}>
                  {visit.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
