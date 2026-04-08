import { useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';
import { HubConnectionBuilder } from '@microsoft/signalr';
import HeroBanner from '@/components/dashboard/HeroBanner';
import TodayGlanceCards from '@/components/dashboard/TodayGlanceCards';
import NeedsAttentionSection from '@/components/dashboard/NeedsAttentionSection';
import TodayProgressSection from '@/components/dashboard/TodayProgressSection';
import StoreCoverageSection from '@/components/dashboard/StoreCoverageSection';
import PinnedAnalyticsSection from '@/components/dashboard/PinnedAnalyticsSection';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'SuperAdmin';
  const queryClient = useQueryClient();

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.getDashboardSummary(),
    refetchInterval: 60_000,
  });

  const { data: progress } = useQuery({
    queryKey: ['dashboard-progress'],
    queryFn: () => api.getDashboardTodayProgress(),
    refetchInterval: 30_000,
  });

  const { data: storeCoverage } = useQuery({
    queryKey: ['dashboard-store-coverage'],
    queryFn: () => api.getDashboardStoreCoverage(),
    refetchInterval: 120_000,
  });

  const { data: pinnedData } = useQuery({
    queryKey: ['dashboard-pinned'],
    queryFn: () => api.getDashboardPinned(),
  });

  const pinnedWidgets: string[] = pinnedData?.pinnedWidgets ?? [];

  const unpinMutation = useMutation({
    mutationFn: (widgetId: string) => api.updateDashboardPinned(widgetId, 'unpin'),
    onMutate: async (widgetId) => {
      await queryClient.cancelQueries({ queryKey: ['dashboard-pinned'] });
      const previous = queryClient.getQueryData(['dashboard-pinned']);
      queryClient.setQueryData(['dashboard-pinned'], (old: any) => ({
        ...old,
        pinnedWidgets: (old?.pinnedWidgets ?? []).filter((id: string) => id !== widgetId),
      }));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['dashboard-pinned'], context?.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-pinned'] });
    },
  });

  // SignalR — refresh on visit events
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const connection = new HubConnectionBuilder()
      .withUrl('/hubs/notifications', {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    connection.start().catch(() => {});

    connection.on('ActivityEvent', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-progress'] });
    });

    return () => { connection.stop(); };
  }, [queryClient]);

  return (
    <div className="space-y-6 pb-10">
      {/* 1. Hero Banner */}
      <HeroBanner summary={summary} isLoading={summaryLoading} />

      {/* 2. Today at a Glance — 4 cards */}
      <TodayGlanceCards summary={summary} isLoading={summaryLoading} />

      {/* 3. Needs Your Attention */}
      {summary && summary.attentionItems && (
        <NeedsAttentionSection items={summary.attentionItems} />
      )}

      {/* 4. Today's Visit Progress */}
      <TodayProgressSection progress={progress} isSuperAdmin={isSuperAdmin} />

      {/* 5. Store Coverage */}
      <StoreCoverageSection stores={storeCoverage?.stores ?? []} />

      {/* 6. Pinned Analytics */}
      {pinnedWidgets.length > 0 && (
        <PinnedAnalyticsSection
          pinnedWidgets={pinnedWidgets}
          onUnpin={(widgetId) => unpinMutation.mutate(widgetId)}
        />
      )}
    </div>
  );
}
