import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useTranslation } from '@/i18n';
import { localizeRegionName } from '@/constants/regions';
import AnalyticsSectionCard from './AnalyticsSectionCard';
import { Trophy, Medal, ChevronDown, ChevronUp } from 'lucide-react';
import type { LeaderboardEmployee } from '@/types';

const INITIAL_COUNT = 5;

interface Props {
  from: string;
  to: string;
  regionId?: string;
  widgetId?: string;
  isPinned?: boolean;
  onPinToggle?: () => void;
}

const MEDALS = [
  { icon: Trophy, color: 'text-yellow-500' },
  { icon: Medal, color: 'text-gray-400' },
  { icon: Medal, color: 'text-amber-700' },
];

export default function EmployeeLeaderboardSection({ from, to, regionId, widgetId, isPinned, onPinToggle }: Props) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'employee-leaderboard', from, to, regionId],
    queryFn: () => api.getEmployeeLeaderboard(from, to, regionId),
  });

  const [expanded, setExpanded] = useState(false);
  const total = data?.employees.length ?? 0;
  const visible = expanded ? data?.employees : data?.employees.slice(0, INITIAL_COUNT);
  const hasMore = total > INITIAL_COUNT;

  return (
    <AnalyticsSectionCard title={t('anLead.title')} description={t('anLead.desc')} isLoading={isLoading} widgetId={widgetId} isPinned={isPinned} onPinToggle={onPinToggle}>
      {visible && visible.length > 0 && (
        <>
          <div className="space-y-2">
            {visible.map((emp, i) => (
              <EmployeeRow key={emp.employeeId} emp={emp} rank={i + 1} />
            ))}
          </div>
          {hasMore && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="w-full mt-3 flex items-center justify-center gap-1 text-sm text-primary hover:text-primary/80 font-medium py-2 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              {expanded ? (
                <><ChevronUp className="h-4 w-4" /> {t('anLead.showLess')}</>
              ) : (
                <><ChevronDown className="h-4 w-4" /> {t('anLead.showAll').replace('{n}', String(total))}</>
              )}
            </button>
          )}
        </>
      )}
      {data && data.employees.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">{t('anLead.noData')}</p>
      )}
    </AnalyticsSectionCard>
  );
}

function EmployeeRow({ emp, rank }: { emp: LeaderboardEmployee; rank: number }) {
  const { t, language } = useTranslation();
  const medal = rank <= 3 ? MEDALS[rank - 1] : null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
      <div className="w-8 text-center shrink-0">
        {medal ? (
          <medal.icon className={`h-5 w-5 mx-auto ${medal.color}`} />
        ) : (
          <span className="text-sm font-medium text-muted-foreground">#{rank}</span>
        )}
      </div>

      {emp.avatarUrl ? (
        <img src={emp.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
      ) : (
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
          {emp.employeeName.charAt(0)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{emp.employeeName}</p>
        <p className="text-xs text-muted-foreground">{localizeRegionName(emp.regionName, language)}</p>
      </div>

      <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
        <Stat label={t('anLead.done')} value={emp.completed} />
        <Stat label={t('anComp.missed')} value={emp.missed} />
        <Stat label={t('anLead.complPct')} value={`${emp.completionRate}%`} />
        <Stat label={t('anLead.apprPct')} value={`${emp.approvalRate}%`} />
      </div>

      <div className="text-right shrink-0 w-16">
        <p className="text-lg font-bold text-primary">{emp.score}</p>
        <p className="text-[10px] text-muted-foreground">{t('anLead.score')}</p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <p className="font-medium text-foreground">{value}</p>
      <p className="text-[10px]">{label}</p>
    </div>
  );
}
