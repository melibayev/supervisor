import { ShieldCheck, ShieldX, Clock } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface ReviewStatusBadgeProps {
  status: string | null;
  className?: string;
}

export function ReviewStatusBadge({ status, className = '' }: ReviewStatusBadgeProps) {
  const { t } = useTranslation();
  if (!status || status === 'NotReviewed') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-500/20 dark:text-slate-400 ${className}`}>
        <Clock className="h-3 w-3" /> {t('review.pending' as any)}
      </span>
    );
  }

  if (status === 'Approved') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-green-700 bg-green-100 dark:bg-green-500/20 dark:text-green-400 ${className}`}>
        <ShieldCheck className="h-3 w-3" /> {t('review.approved' as any)}
      </span>
    );
  }

  if (status === 'Rejected') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-red-700 bg-red-100 dark:bg-red-500/20 dark:text-red-400 ${className}`}>
        <ShieldX className="h-3 w-3" /> {t('review.rejected' as any)}
      </span>
    );
  }

  return null;
}
