import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef, useCallback } from 'react';
import { HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { api } from '@/api/client';
import { useTranslation } from '@/i18n';
import { localizeRegionName } from '@/constants/regions';
import AnalyticsSectionCard from './AnalyticsSectionCard';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Pause, Play, Radio, Users } from 'lucide-react';
import type { LiveFeedEvent } from '@/types';

const EVENT_STYLES: Record<string, { color: string; badge: 'success' | 'default' | 'destructive' | 'warning' | 'secondary' }> = {
  CheckIn: { color: 'text-blue-600', badge: 'default' },
  VisitCompleted: { color: 'text-green-600', badge: 'success' },
  VisitApproved: { color: 'text-green-600', badge: 'success' },
  VisitRejected: { color: 'text-red-600', badge: 'destructive' },
  ScheduleMissed: { color: 'text-yellow-600', badge: 'warning' },
};

interface Props {
  widgetId?: string;
  isPinned?: boolean;
  onPinToggle?: () => void;
}

export default function LiveActivityFeedSection({ widgetId, isPinned, onPinToggle }: Props = {}) {
  const { t, language, dateLocale } = useTranslation();
  const [paused, setPaused] = useState(false);
  const [realtimeEvents, setRealtimeEvents] = useState<LiveFeedEvent[]>([]);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'live-feed'],
    queryFn: () => api.getAnalyticsLiveFeed(30),
    refetchInterval: paused ? false : 30000,
  });

  // SignalR for real-time updates
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const connection = new HubConnectionBuilder()
      .withUrl(`${import.meta.env.VITE_API_URL || '/api'}/../hubs/notifications`, { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .build();

    connection.on('ActivityEvent', (event: LiveFeedEvent) => {
      if (!pausedRef.current) {
        setRealtimeEvents(prev => [event, ...prev].slice(0, 50));
      }
    });

    connection.start().then(() => {
      connection.invoke('JoinAnalyticsGroup').catch(() => {});
    }).catch(() => {});

    return () => {
      connection.stop();
    };
  }, []);

  // Merge realtime events with polled data, deduplicate by id
  const allEvents = (() => {
    const polled = data?.events ?? [];
    const merged = [...realtimeEvents, ...polled];
    const seen = new Set<string>();
    return merged.filter(e => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50);
  })();

  const feedMessage = useCallback((event: LiveFeedEvent) => {
    const key = ('feed.' + event.type) as any;
    const template = t(key);
    if (template === key) return event.message; // fallback
    return template.replace('{name}', event.employeeName).replace('{store}', event.storeName);
  }, [t]);

  return (
    <AnalyticsSectionCard
      title={t('anLive.title')}
      description={t('anLive.desc')}
      isLoading={isLoading}
      widgetId={widgetId}
      isPinned={isPinned}
      onPinToggle={onPinToggle}
      action={
        <div className="flex items-center gap-3">
          {data && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              <span>{data.onlineEmployees} {t('anLive.online')}</span>
            </div>
          )}
          <button
            onClick={() => setPaused(p => !p)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded border hover:bg-muted transition-colors"
          >
            {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            {paused ? t('anLive.resume') : t('anLive.pause')}
          </button>
          {!paused && <Radio className="h-3.5 w-3.5 text-green-500 animate-pulse" />}
        </div>
      }
    >
      {allEvents.length > 0 ? (
        <div className="space-y-1 max-h-[500px] overflow-auto">
          {allEvents.map(event => {
            const style = EVENT_STYLES[event.type] ?? EVENT_STYLES.CheckIn;
            return (
              <div key={event.id} className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 transition-colors">
                <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${style.color.replace('text-', 'bg-')}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{feedMessage(event)}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant={style.badge} className="text-[10px] px-1.5 py-0">
                      {t(('event.' + event.type) as any) || event.type.replace(/([A-Z])/g, ' $1').trim()}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">{localizeRegionName(event.regionName, language)}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true, locale: dateLocale })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-8">{t('anLive.noActivity')}</p>
      )}
    </AnalyticsSectionCard>
  );
}
