import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useTranslation } from '@/i18n';
import { localizeRegionName } from '@/constants/regions';
import AnalyticsSectionCard from './AnalyticsSectionCard';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useState } from 'react';
import type { RegionalComparisonRegion } from '@/types';

interface Props {
  from: string;
  to: string;
  widgetId?: string;
  isPinned?: boolean;
  onPinToggle?: () => void;
}

type SortKey = 'completionRate' | 'approvalRate' | 'completedVisits' | 'missedVisits';

export default function RegionalComparisonSection({ from, to, widgetId, isPinned, onPinToggle }: Props) {
  const { t, language } = useTranslation();
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', 'regional-comparison', from, to],
    queryFn: () => api.getRegionalComparison(from, to),
    retry: false,
  });

  const [sortBy, setSortBy] = useState<SortKey>('completionRate');

  if (error) return null; // 403 for Admin — just hide

  const sorted = data?.regions
    ? [...data.regions].sort((a, b) => (b[sortBy] as number) - (a[sortBy] as number))
    : [];

  return (
    <AnalyticsSectionCard title={t('anReg.title')} description={t('anReg.desc')} isLoading={isLoading} widgetId={widgetId} isPinned={isPinned} onPinToggle={onPinToggle}>
      {data && (
        <>
          {/* Bar Chart */}
          <div className="mb-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.regions.filter(r => r.scheduledVisits > 0).map(r => ({ ...r, regionLabel: localizeRegionName(r.regionName, language) }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="regionLabel" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} unit="%" />
                <Tooltip />
                <Bar dataKey="completionRate" fill="#CC0000" name={t('anReg.completionPct')} radius={[4, 4, 0, 0]} />
                <Bar dataKey="approvalRate" fill="#22c55e" name={t('anReg.approvalPct')} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sortable Table */}
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2 font-medium">{t('anReg.region')}</th>
                  <th className="p-2 font-medium text-center">{t('anReg.employees')}</th>
                  <th className="p-2 font-medium text-center">{t('anReg.stores')}</th>
                  <SortableTh current={sortBy} sortKey="completedVisits" onClick={setSortBy}>{t('anReg.completed')}</SortableTh>
                  <SortableTh current={sortBy} sortKey="missedVisits" onClick={setSortBy}>{t('anReg.missed')}</SortableTh>
                  <SortableTh current={sortBy} sortKey="completionRate" onClick={setSortBy}>{t('anReg.complPct')}</SortableTh>
                  <SortableTh current={sortBy} sortKey="approvalRate" onClick={setSortBy}>{t('anReg.apprPct')}</SortableTh>
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <tr key={r.regionId} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-2 font-medium">{localizeRegionName(r.regionName, language)}</td>
                    <td className="p-2 text-center">{r.activeEmployees}/{r.totalEmployees}</td>
                    <td className="p-2 text-center">{r.totalStores}</td>
                    <td className="p-2 text-center text-green-600">{r.completedVisits}</td>
                    <td className="p-2 text-center text-red-600">{r.missedVisits}</td>
                    <td className="p-2 text-center font-medium">{r.completionRate}%</td>
                    <td className="p-2 text-center">{r.approvalRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AnalyticsSectionCard>
  );
}

function SortableTh({ current, sortKey, onClick, children }: {
  current: SortKey; sortKey: SortKey; onClick: (k: SortKey) => void; children: React.ReactNode;
}) {
  return (
    <th
      className={`p-2 font-medium text-center cursor-pointer select-none hover:text-foreground ${current === sortKey ? 'text-primary underline' : 'text-muted-foreground'}`}
      onClick={() => onClick(sortKey)}
    >
      {children}
    </th>
  );
}
