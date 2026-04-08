import { Link } from 'react-router-dom';
import {
  ClipboardCheck, UserPlus, UserX, AlertTriangle,
  CheckCircle, ArrowRight
} from 'lucide-react';
import { useTranslation } from '@/i18n';

interface AttentionItems {
  visitsAwaitingReview: number;
  pendingRegistrations: number;
  employeesWithNoActivityToday: number;
}

interface Props {
  items: AttentionItems;
}

export default function NeedsAttentionSection({ items }: Props) {
  const { t } = useTranslation();
  const actionItems = [
    items.visitsAwaitingReview > 0 && {
      id: 'review',
      icon: <ClipboardCheck className="w-4 h-4" />,
      title: t('dash.visitsWaitingReview' as any),
      description: `${items.visitsAwaitingReview} ${t('dash.completedNeedApproval' as any)}`,
      count: items.visitsAwaitingReview,
      to: '/admin/visits?reviewStatus=NotReviewed',
      actionLabel: t('dash.reviewNow' as any),
      countBg: 'bg-amber-100', countText: 'text-amber-700',
      iconBg: 'bg-amber-100', iconColor: 'text-amber-600',
      borderColor: 'border-l-amber-500',
    },
    items.pendingRegistrations > 0 && {
      id: 'registrations',
      icon: <UserPlus className="w-4 h-4" />,
      title: t('dash.newEmployeeRegistrations' as any),
      description: `${items.pendingRegistrations} ${t('dash.employeesWaitingApproval' as any)}`,
      count: items.pendingRegistrations,
      to: '/admin/employees?tab=pending',
      actionLabel: t('dash.reviewRequests' as any),
      countBg: 'bg-blue-100', countText: 'text-blue-700',
      iconBg: 'bg-blue-100', iconColor: 'text-blue-600',
      borderColor: 'border-l-blue-500',
    },
    items.employeesWithNoActivityToday > 0 && {
      id: 'inactive',
      icon: <UserX className="w-4 h-4" />,
      title: t('dash.employeesNoActivity' as any),
      description: `${items.employeesWithNoActivityToday} ${t('dash.employeesNoCheckin' as any)}`,
      count: items.employeesWithNoActivityToday,
      to: '/admin/employees',
      actionLabel: t('dash.viewEmployees' as any),
      countBg: 'bg-red-100', countText: 'text-red-700',
      iconBg: 'bg-red-100', iconColor: 'text-red-600',
      borderColor: 'border-l-red-500',
    },
  ].filter(Boolean) as {
    id: string; icon: React.ReactNode; title: string; description: string;
    count: number; to: string; actionLabel: string; countBg: string;
    countText: string; iconBg: string; iconColor: string; borderColor: string;
  }[];

  if (actionItems.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl px-6 py-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <CheckCircle className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <p className="font-semibold text-green-800">{t('dash.allCaughtUp')}</p>
          <p className="text-sm text-green-600 mt-0.5">
            {t('dash.noPendingActions' as any)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900">{t('dash.needsYourAttention' as any)}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {actionItems.length} {actionItems.length !== 1 ? t('dash.itemsRequireAction' as any) : t('dash.itemRequiresAction' as any)}
          </p>
        </div>
      </div>

      <div className="divide-y divide-slate-50">
        {actionItems.map(item => (
          <Link
            key={item.id}
            to={item.to}
            className={`flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors border-l-4 ${item.borderColor} group`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${item.iconBg} ${item.iconColor}`}>
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
            </div>
            <span className={`flex-shrink-0 text-sm font-black px-3 py-1 rounded-full ${item.countBg} ${item.countText}`}>
              {item.count}
            </span>
            <div className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-slate-400 group-hover:text-violet-600 transition-colors whitespace-nowrap">
              {item.actionLabel}
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
