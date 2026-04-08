import { Link } from 'react-router-dom';
import {
  Calendar, CheckCircle, XCircle, Loader2, ArrowRight
} from 'lucide-react';
import type { DashboardSummary } from '@/types';
import { useTranslation } from '@/i18n';

interface Props {
  summary: DashboardSummary | undefined;
  isLoading: boolean;
}

export default function TodayGlanceCards({ summary, isLoading }: Props) {
  const { t } = useTranslation();
  const stats = summary?.today;

  const cards = [
    {
      label: t('dash.scheduledToday' as any),
      value: stats?.scheduledVisits ?? 0,
      icon: <Calendar className="w-5 h-5" />,
      bg: 'bg-violet-50',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-700',
      valueColor: 'text-slate-900',
      sub: t('dash.totalPlannedVisits' as any),
      link: '/admin/schedules',
    },
    {
      label: t('dash.completedTodayCard' as any),
      value: stats?.completedVisits ?? 0,
      icon: <CheckCircle className="w-5 h-5" />,
      bg: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-700',
      valueColor: 'text-green-700',
      sub: t('dash.ofScheduled' as any).replace('{n}', String(stats?.scheduledVisits ?? 0)),
      link: '/admin/visits?status=Completed',
    },
    {
      label: t('dash.missedTodayCard' as any),
      value: stats?.missedVisits ?? 0,
      icon: <XCircle className="w-5 h-5" />,
      bg: (stats?.missedVisits ?? 0) > 0 ? 'bg-red-50' : 'bg-slate-50',
      iconBg: (stats?.missedVisits ?? 0) > 0 ? 'bg-red-100' : 'bg-slate-100',
      iconColor: (stats?.missedVisits ?? 0) > 0 ? 'text-red-700' : 'text-slate-500',
      valueColor: (stats?.missedVisits ?? 0) > 0 ? 'text-red-700' : 'text-slate-400',
      sub: (stats?.missedVisits ?? 0) > 0 ? t('dash.requiresAttention' as any) : t('dash.allGood' as any),
      link: '/admin/visits?status=Missed',
    },
    {
      label: t('dash.inProgressNowCard' as any),
      value: stats?.inProgressVisits ?? 0,
      icon: <Loader2 className={`w-5 h-5 ${(stats?.inProgressVisits ?? 0) > 0 ? 'animate-spin' : ''}`} />,
      bg: (stats?.inProgressVisits ?? 0) > 0 ? 'bg-blue-50' : 'bg-slate-50',
      iconBg: (stats?.inProgressVisits ?? 0) > 0 ? 'bg-blue-100' : 'bg-slate-100',
      iconColor: (stats?.inProgressVisits ?? 0) > 0 ? 'text-blue-700' : 'text-slate-400',
      valueColor: (stats?.inProgressVisits ?? 0) > 0 ? 'text-blue-700' : 'text-slate-400',
      sub: t('dash.employeesInStore' as any),
      link: '/admin/visits?status=InProgress',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-pulse">
            <div className="w-10 h-10 bg-slate-100 rounded-xl mb-3" />
            <div className="h-8 bg-slate-100 rounded w-16 mb-2" />
            <div className="h-3 bg-slate-100 rounded w-24" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(card => (
        <Link
          key={card.label}
          to={card.link}
          className={`${card.bg} rounded-2xl border border-white shadow-sm p-5 hover:shadow-md transition-all duration-200 group hover:-translate-y-0.5`}
        >
          <div className={`w-10 h-10 ${card.iconBg} rounded-xl flex items-center justify-center ${card.iconColor} mb-4`}>
            {card.icon}
          </div>
          <p className={`text-3xl font-black ${card.valueColor}`}>
            {card.value}
          </p>
          <p className="text-sm font-semibold text-slate-700 mt-1">
            {card.label}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
          <div className="flex items-center gap-1 mt-3 text-xs font-medium text-slate-400 group-hover:text-violet-600 transition-colors">
            {t('dash.viewDetails' as any)}
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      ))}
    </div>
  );
}
