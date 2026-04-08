import { CalendarClock } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { getDueDateInfo } from '@/utils/dueDateLabel';

interface DueDateBadgeProps {
  dueDate: string;
  className?: string;
}

export function DueDateBadge({ dueDate, className = '' }: DueDateBadgeProps) {
  const { t, dateLocale } = useTranslation();
  const info = getDueDateInfo(dueDate, t as any, dateLocale);

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${info.color} ${info.bg} ${className}`}>
      <CalendarClock className="h-3 w-3" />
      {info.label}
    </span>
  );
}
