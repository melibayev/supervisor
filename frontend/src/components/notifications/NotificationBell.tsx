import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { HubConnectionBuilder, HubConnection } from '@microsoft/signalr';
import { api } from '@/api/client';
import { Bell, Check, CheckCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import type { Notification as AppNotification } from '@/types';
import { useTranslation } from '@/i18n';
import { translateNotifTitle, translateNotifBody } from '@/utils/notificationTranslation';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t, language, dateLocale } = useTranslation();

  const { data: countData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => api.getUnreadNotificationCount(),
    refetchInterval: 60_000
  });

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(1, 20),
    enabled: isOpen
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.setQueryData(['notifications-unread-count'], { count: 0 });
    }
  });

  // SignalR connection
  useEffect(() => {
    let connection: HubConnection | null = null;

    const connect = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      connection = new HubConnectionBuilder()
        .withUrl('/hubs/notifications', {
          accessTokenFactory: () => localStorage.getItem('accessToken') ?? ''
        })
        .withAutomaticReconnect()
        .build();

      connection.on('NewNotification', (notification: AppNotification) => {
        queryClient.setQueryData(
          ['notifications-unread-count'],
          (old: { count: number } | undefined) => ({ count: (old?.count ?? 0) + 1 })
        );
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
      });

      try {
        await connection.start();
      } catch (err) {
        console.error('SignalR notification connection failed:', err);
      }
    };

    connect();

    return () => {
      connection?.stop();
    };
  }, [queryClient]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const unreadCount = countData?.count ?? 0;

  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.isRead) markReadMutation.mutate(notif.id);
    if (notif.actionUrl) navigate(notif.actionUrl);
    setIsOpen(false);
  };

  const getNotifIcon = (type: string) => {
    if (type.includes('Approved')) return '✅';
    if (type.includes('Rejected')) return '❌';
    if (type.includes('Schedule') && type.includes('Created')) return '📅';
    if (type.includes('Schedule') && type.includes('Cancelled')) return '🚫';
    if (type.includes('Missed')) return '🚨';
    if (type.includes('Comment')) return '💬';
    if (type.includes('Submitted')) return '📋';
    if (type.includes('CheckedIn')) return '📍';
    return '🔔';
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 transition-colors relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center font-bold px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-[480px] flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-shrink-0">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('notif.title')} {unreadCount > 0 && <span className="text-slate-400">({unreadCount})</span>}
            </span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="text-xs text-primary hover:underline"
              >
                {t('notif.markAllRead')}
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {notifications?.items && notifications.items.length > 0 ? (
              notifications.items.map(notif => (
                <button
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-3',
                    !notif.isRead && 'bg-primary/5'
                  )}
                >
                  {!notif.isRead && (
                    <span className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                  )}
                  <div className={cn('flex-1 min-w-0', notif.isRead && 'ml-5')}>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{getNotifIcon(notif.type)}</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{translateNotifTitle(notif.type, notif.title, t)}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{translateNotifBody(notif.type, notif.metadataJson, notif.body, t, language)}</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: dateLocale })}
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-sm text-slate-400">{t('notif.noNotifications')}</div>
            )}
          </div>

          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
            <button
              onClick={() => { navigate('/notifications'); setIsOpen(false); }}
              className="w-full text-center text-xs text-primary hover:underline font-medium"
            >
              {t('notif.viewAll')} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
