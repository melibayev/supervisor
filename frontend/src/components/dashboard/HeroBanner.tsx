import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import {
  XCircle, ClipboardCheck, UserPlus, ArrowRight, CheckCircle
} from 'lucide-react';
import type { DashboardSummary } from '@/types';
import { useTranslation } from '@/i18n';
import { localizeRegionName } from '@/constants/regions';

interface Props {
  summary: DashboardSummary | undefined;
  isLoading: boolean;
}

export default function HeroBanner({ summary, isLoading }: Props) {
  const { t, language, dateLocale } = useTranslation();
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? t('dash.goodMorning') :
    hour < 17 ? t('dash.goodAfternoon') :
    t('dash.goodEvening');

  const today = format(new Date(), 'EEEE, MMMM d', { locale: dateLocale });

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 p-8">
        <div className="space-y-3">
          <Skeleton className="h-9 w-72 bg-white/20" />
          <Skeleton className="h-4 w-48 bg-white/20" />
          <Skeleton className="h-4 w-64 bg-white/20" />
          <div className="flex gap-2 mt-4">
            <Skeleton className="h-8 w-40 bg-white/20 rounded-xl" />
            <Skeleton className="h-8 w-48 bg-white/20 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  const todayStats = summary?.today;
  const attentionItems = summary?.attentionItems;

  const chips = [
    todayStats && todayStats.missedVisits > 0 && {
      icon: <XCircle className="w-3.5 h-3.5" />,
      label: `${todayStats.missedVisits} ${t('dash.visitsMissedToday' as any)}`,
      to: '/admin/visits?status=Missed',
      color: 'bg-red-500/20 hover:bg-red-500/30 text-white border-red-400/30',
    },
    attentionItems && attentionItems.visitsAwaitingReview > 0 && {
      icon: <ClipboardCheck className="w-3.5 h-3.5" />,
      label: `${attentionItems.visitsAwaitingReview} ${t('dash.awaitingReview' as any)}`,
      to: '/admin/visits?reviewStatus=NotReviewed',
      color: 'bg-amber-500/20 hover:bg-amber-500/30 text-white border-amber-400/30',
    },
    attentionItems && attentionItems.pendingRegistrations > 0 && {
      icon: <UserPlus className="w-3.5 h-3.5" />,
      label: `${attentionItems.pendingRegistrations} ${t('dash.newRegsPending' as any)}`,
      to: '/admin/employees?tab=pending',
      color: 'bg-blue-500/20 hover:bg-blue-500/30 text-white border-blue-400/30',
    },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; to: string; color: string }[];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 p-8 text-white shadow-lg">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-white/5" />
        <div className="absolute top-8 right-32 w-32 h-32 rounded-full bg-white/5" />
      </div>

      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              {greeting}, {summary?.adminName?.split(' ')[0]} 👋
            </h1>
            <p className="text-violet-200 mt-1 text-sm font-medium">
              {today} &nbsp;·&nbsp; {summary?.regionName ? localizeRegionName(summary.regionName, language) : t('dash.allRegions' as any)}
            </p>
            <p className="text-violet-300 mt-1 text-sm">
              {t('dash.whatsHappening' as any)}
            </p>
          </div>

          {todayStats && (
            <div className="flex-shrink-0 flex flex-col items-center bg-white/10 backdrop-blur rounded-2xl px-5 py-3 border border-white/20">
              <span className="text-3xl font-black">
                {todayStats.completionRate.toFixed(0)}%
              </span>
              <span className="text-violet-200 text-xs font-medium mt-0.5">
                {t('dash.completionToday')}
              </span>
            </div>
          )}
        </div>

        {chips.length > 0 ? (
          <div className="flex flex-wrap gap-2 mt-5">
            {chips.map((chip, i) => (
              <Link
                key={i}
                to={chip.to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border backdrop-blur transition-all duration-200 ${chip.color}`}
              >
                {chip.icon}
                {chip.label}
                <ArrowRight className="w-3 h-3 ml-0.5" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 mt-5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-green-500/20 border border-green-400/30 text-white">
              <CheckCircle className="w-3.5 h-3.5" />
              {t('dash.allCaughtUp')} — {t('dash.noPendingActions' as any).split('.')[0]}!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
