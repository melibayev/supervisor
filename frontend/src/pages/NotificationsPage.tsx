import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, CheckCheck, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';
import { translateNotifTitle, translateNotifBody } from '@/utils/notificationTranslation';

export default function NotificationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const unreadOnly = searchParams.get('filter') === 'unread';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, language, dateLocale } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications-page', page, unreadOnly],
    queryFn: () => api.getNotifications(page, 20, unreadOnly || undefined)
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-page'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-page'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-page'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    }
  });

  const totalPages = data ? Math.ceil(data.totalCount / 20) : 0;

  const getNotifIcon = (type: string) => {
    if (type.includes('Approved')) return '✅';
    if (type.includes('Rejected')) return '❌';
    if (type.includes('Schedule') && type.includes('Created')) return '📅';
    if (type.includes('Cancelled')) return '🚫';
    if (type.includes('Missed')) return '🚨';
    if (type.includes('Comment')) return '💬';
    if (type.includes('Submitted')) return '📋';
    if (type.includes('CheckedIn')) return '📍';
    return '🔔';
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('notif.title')}</h1>
          <p className="text-slate-500">{data?.totalCount ?? 0} {t('notif.title').toLowerCase()}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => markAllReadMutation.mutate()}>
          <CheckCheck className="h-4 w-4 mr-1.5" /> {t('notif.markAllRead')}
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          variant={!unreadOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setSearchParams({}); setPage(1); }}
        >
          {t('notif.allNotifications')}
        </Button>
        <Button
          variant={unreadOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setSearchParams({ filter: 'unread' }); setPage(1); }}
        >
          {t('notif.unreadOnly')}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
            {data?.items && data.items.length > 0 ? (
              data.items.map(notif => (
                <div
                  key={notif.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors',
                    !notif.isRead && 'bg-primary/5'
                  )}
                  onClick={() => {
                    if (!notif.isRead) markReadMutation.mutate(notif.id);
                    if (notif.actionUrl) navigate(notif.actionUrl);
                  }}
                >
                  {!notif.isRead && <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />}
                  <span className="text-lg flex-shrink-0">{getNotifIcon(notif.type)}</span>
                  <div className={cn('flex-1 min-w-0', notif.isRead && 'ml-5')}>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{translateNotifTitle(notif.type, notif.title, t)}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{translateNotifBody(notif.type, notif.metadataJson, notif.body, t, language)}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: dateLocale })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(notif.id); }}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-12 text-center text-sm text-slate-400">
                <Bell className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                <p>{t('notif.noNotifications')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{t('common.page')} {page} {t('common.of')} {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
