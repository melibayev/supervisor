import { Link } from 'react-router-dom';
import { subDays, format } from 'date-fns';
import {
  Pin, PinOff, ArrowRight, ExternalLink,
  CheckCircle, Trophy, Store, ThumbsUp,
  Map, AlertTriangle, Radio
} from 'lucide-react';
import CompletionRateSection from '@/components/analytics/CompletionRateSection';
import EmployeeLeaderboardSection from '@/components/analytics/EmployeeLeaderboardSection';
import StoreFrequencySection from '@/components/analytics/StoreFrequencySection';
import ApprovalRateSection from '@/components/analytics/ApprovalRateSection';
import RegionalComparisonSection from '@/components/analytics/RegionalComparisonSection';
import MissedPatternsSection from '@/components/analytics/MissedPatternsSection';
import LiveActivityFeedSection from '@/components/analytics/LiveActivityFeedSection';
import { useTranslation } from '@/i18n';

const WIDGET_CONFIG: Record<string, {
  titleKey: string;
  subtitleKey: string;
  icon: React.ReactNode;
  Component: React.ComponentType<any>;
}> = {
  'completion-rate': {
    titleKey: 'widget.completionTitle',
    subtitleKey: 'widget.completionSub',
    icon: <CheckCircle className="w-4 h-4" />,
    Component: CompletionRateSection,
  },
  'employee-leaderboard': {
    titleKey: 'widget.leaderboardTitle',
    subtitleKey: 'widget.leaderboardSub',
    icon: <Trophy className="w-4 h-4" />,
    Component: EmployeeLeaderboardSection,
  },
  'store-frequency': {
    titleKey: 'widget.storeFreqTitle',
    subtitleKey: 'widget.storeFreqSub',
    icon: <Store className="w-4 h-4" />,
    Component: StoreFrequencySection,
  },
  'approval-rate': {
    titleKey: 'widget.approvalTitle',
    subtitleKey: 'widget.approvalSub',
    icon: <ThumbsUp className="w-4 h-4" />,
    Component: ApprovalRateSection,
  },
  'regional-comparison': {
    titleKey: 'widget.regionalTitle',
    subtitleKey: 'widget.regionalSub',
    icon: <Map className="w-4 h-4" />,
    Component: RegionalComparisonSection,
  },
  'missed-patterns': {
    titleKey: 'widget.missedTitle',
    subtitleKey: 'widget.missedSub',
    icon: <AlertTriangle className="w-4 h-4" />,
    Component: MissedPatternsSection,
  },
  'live-feed': {
    titleKey: 'widget.liveTitle',
    subtitleKey: 'widget.liveSub',
    icon: <Radio className="w-4 h-4" />,
    Component: LiveActivityFeedSection,
  },
};

interface Props {
  pinnedWidgets: string[];
  onUnpin: (widgetId: string) => void;
}

export default function PinnedAnalyticsSection({ pinnedWidgets, onUnpin }: Props) {
  const { t } = useTranslation();
  const from = format(subDays(new Date(), 29), 'yyyy-MM-dd');
  const to = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Pin className="w-4 h-4 text-violet-600" />
          <h2 className="text-sm font-semibold text-slate-700">{t('dash.pinnedAnalytics' as any)}</h2>
        </div>
        <div className="flex-1 h-px bg-slate-200" />
        <Link
          to="/admin/analytics"
          className="text-xs text-violet-600 font-semibold hover:underline flex items-center gap-1"
        >
          {t('dash.openFullAnalytics' as any)}
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-6">
        {pinnedWidgets.map(widgetId => {
          const config = WIDGET_CONFIG[widgetId];
          if (!config) return null;
          const { Component } = config;

          return (
            <div
              key={widgetId}
              className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-violet-100 rounded-xl flex items-center justify-center text-violet-600">
                    {config.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{t(config.titleKey as any)}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{t(config.subtitleKey as any)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/admin/analytics#${widgetId}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {t('widget.seeInDetail' as any)}
                  </Link>
                  <button
                    onClick={() => onUnpin(widgetId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 text-slate-500 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                  >
                    <PinOff className="w-3.5 h-3.5" />
                    {t('analytics.remove')}
                  </button>
                </div>
              </div>

              <div className="p-6">
                {widgetId === 'live-feed' ? (
                  <Component />
                ) : widgetId === 'regional-comparison' ? (
                  <Component from={from} to={to} />
                ) : (
                  <Component from={from} to={to} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
