import { useState, useMemo, useEffect } from 'react';
import { subDays, format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { api } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';
import { RegionSelect } from '@/components/RegionSelect';
import CompletionRateSection from '@/components/analytics/CompletionRateSection';
import EmployeeLeaderboardSection from '@/components/analytics/EmployeeLeaderboardSection';
import StoreFrequencySection from '@/components/analytics/StoreFrequencySection';
import ApprovalRateSection from '@/components/analytics/ApprovalRateSection';
import RegionalComparisonSection from '@/components/analytics/RegionalComparisonSection';
import MissedPatternsSection from '@/components/analytics/MissedPatternsSection';
import LiveActivityFeedSection from '@/components/analytics/LiveActivityFeedSection';
import { useTranslation } from '@/i18n';

const PRESETS = [
  { label: '7', days: 7 },
  { label: '30', days: 30 },
  { label: '90', days: 90 },
] as const;

export default function AdminAnalytics() {
  const { t } = useTranslation();
  const user = useAuthStore(s => s.user);
  const isSuperAdmin = user?.role === 'SuperAdmin';
  const queryClient = useQueryClient();

  const [days, setDays] = useState(7);
  const [regionId, setRegionId] = useState('all');

  const { from, to } = useMemo(() => ({
    from: format(subDays(new Date(), days), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  }), [days]);

  const effectiveRegion = isSuperAdmin ? regionId : undefined;

  // Pin system
  const { data: pinnedData } = useQuery({
    queryKey: ['dashboard-pinned'],
    queryFn: () => api.getDashboardPinned(),
  });
  const pinnedWidgets: string[] = pinnedData?.pinnedWidgets ?? [];

  const pinMutation = useMutation({
    mutationFn: ({ widgetId, action }: { widgetId: string; action: 'pin' | 'unpin' }) =>
      api.updateDashboardPinned(widgetId, action),
    onMutate: async ({ widgetId, action }) => {
      await queryClient.cancelQueries({ queryKey: ['dashboard-pinned'] });
      const previous = queryClient.getQueryData(['dashboard-pinned']);
      queryClient.setQueryData(['dashboard-pinned'], (old: any) => ({
        ...old,
        pinnedWidgets: action === 'pin'
          ? [...(old?.pinnedWidgets ?? []), widgetId]
          : (old?.pinnedWidgets ?? []).filter((id: string) => id !== widgetId),
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

  // Scroll to hash on mount (from dashboard "See in detail" links)
  const location = useLocation();
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [location.hash]);

  const makePinProps = (widgetId: string) => ({
    widgetId,
    isPinned: pinnedWidgets.includes(widgetId),
    onPinToggle: () => pinMutation.mutate({
      widgetId,
      action: pinnedWidgets.includes(widgetId) ? 'unpin' : 'pin',
    }),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">{t('analytics.title')}</h1>
          <p className="text-secondary-500">{t('analytics.detailedMetrics' as any)}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Date Presets */}
          <div className="inline-flex rounded-lg border">
            {PRESETS.map(p => (
              <button
                key={p.days}
                onClick={() => setDays(p.days)}
                className={`px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  days === p.days
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {p.label} {t('analytics.days' as any)}
              </button>
            ))}
          </div>

          {/* Region Filter (SuperAdmin only) */}
          {isSuperAdmin && (
            <RegionSelect value={regionId} onChange={setRegionId} includeAll />
          )}
        </div>
      </div>

      {/* Section 1: Completion Rate */}
      <div id="completion-rate">
        <CompletionRateSection from={from} to={to} regionId={effectiveRegion} {...makePinProps('completion-rate')} />
      </div>

      {/* Section 2: Employee Leaderboard */}
      <div id="employee-leaderboard">
        <EmployeeLeaderboardSection from={from} to={to} regionId={effectiveRegion} {...makePinProps('employee-leaderboard')} />
      </div>

      {/* Section 3: Store Frequency */}
      <div id="store-frequency">
        <StoreFrequencySection from={from} to={to} regionId={effectiveRegion} {...makePinProps('store-frequency')} />
      </div>

      {/* Section 4: Approval Rate */}
      <div id="approval-rate">
        <ApprovalRateSection from={from} to={to} regionId={effectiveRegion} {...makePinProps('approval-rate')} />
      </div>

      {/* Section 5: Regional Comparison (SuperAdmin only) */}
      {isSuperAdmin && (
        <div id="regional-comparison">
          <RegionalComparisonSection from={from} to={to} {...makePinProps('regional-comparison')} />
        </div>
      )}

      {/* Section 6: Missed Patterns */}
      <div id="missed-patterns">
        <MissedPatternsSection from={from} to={to} regionId={effectiveRegion} {...makePinProps('missed-patterns')} />
      </div>

      {/* Section 7: Live Feed */}
      <div id="live-feed">
        <LiveActivityFeedSection {...makePinProps('live-feed')} />
      </div>
    </div>
  );
}
