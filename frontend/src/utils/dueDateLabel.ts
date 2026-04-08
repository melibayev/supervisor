import { differenceInCalendarDays, format, isToday, isTomorrow, isPast } from 'date-fns';
import type { Locale } from 'date-fns';

export type DueDateUrgency = 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'future';

export interface DueDateInfo {
  label: string;
  urgency: DueDateUrgency;
  color: string;
  bg: string;
  sortKey: number;
}

export function getDueDateInfo(dueDate: string, t?: (key: string) => string, locale?: Locale): DueDateInfo {
  const d = new Date(dueDate);
  const today = new Date();
  const diff = differenceInCalendarDays(d, today);

  if (isPast(d) && !isToday(d)) {
    return {
      label: t ? t('due.overdue').replace('{date}', format(d, 'MMM d', { locale })) : `Overdue (${format(d, 'MMM d')})`,
      urgency: 'overdue',
      color: 'text-red-700 dark:text-red-400',
      bg: 'bg-red-100 dark:bg-red-500/20',
      sortKey: 0,
    };
  }

  if (isToday(d)) {
    return {
      label: t ? t('due.dueToday') : 'Due today',
      urgency: 'today',
      color: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-100 dark:bg-amber-500/20',
      sortKey: 1,
    };
  }

  if (isTomorrow(d)) {
    return {
      label: t ? t('due.dueTomorrow') : 'Due tomorrow',
      urgency: 'tomorrow',
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-100 dark:bg-orange-500/20',
      sortKey: 2,
    };
  }

  if (diff <= 7) {
    return {
      label: t ? t('due.dueDate').replace('{date}', format(d, 'EEE, MMM d', { locale })) : `Due ${format(d, 'EEE, MMM d')}`,
      urgency: 'upcoming',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-100 dark:bg-blue-500/20',
      sortKey: 3,
    };
  }

  return {
    label: t ? t('due.dueDate').replace('{date}', format(d, 'MMM d', { locale })) : `Due ${format(d, 'MMM d')}`,
    urgency: 'future',
    color: 'text-slate-500 dark:text-slate-400',
    bg: 'bg-slate-100 dark:bg-slate-500/20',
    sortKey: 4,
  };
}
