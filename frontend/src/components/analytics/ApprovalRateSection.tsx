import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useTranslation } from '@/i18n';
import AnalyticsSectionCard from './AnalyticsSectionCard';
import {
  PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { format } from 'date-fns';

interface Props {
  from: string;
  to: string;
  regionId?: string;
  widgetId?: string;
  isPinned?: boolean;
  onPinToggle?: () => void;
}

const COLORS = { approved: '#22c55e', rejected: '#ef4444', pending: '#a3a3a3' };

export default function ApprovalRateSection({ from, to, regionId, widgetId, isPinned, onPinToggle }: Props) {
  const { t, dateLocale } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', 'approval-rate', from, to, regionId],
    queryFn: () => api.getApprovalRate(from, to, regionId),
  });

  const overall = data?.overall;
  const donutData = overall ? [
    { name: t('anAppr.approved'), value: overall.approved, color: COLORS.approved },
    { name: t('anAppr.rejected'), value: overall.rejected, color: COLORS.rejected },
    { name: t('anAppr.pending'), value: overall.pendingReview, color: COLORS.pending },
  ].filter(d => d.value > 0) : [];

  return (
    <AnalyticsSectionCard title={t('anAppr.title')} description={t('anAppr.desc')} isLoading={isLoading} widgetId={widgetId} isPinned={isPinned} onPinToggle={onPinToggle}>
      {overall && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Donut */}
            <div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-center -mt-2">
                <p className="text-3xl font-bold text-green-600">{overall.approvalRate}%</p>
                <p className="text-xs text-muted-foreground">{t('anAppr.approvalRate')}</p>
              </div>
            </div>

            {/* KPIs */}
            <div className="flex items-center">
              <div className="grid grid-cols-2 gap-3 w-full">
                <KPI label={t('anAppr.totalReviewed')} value={overall.totalReviewed} />
                <KPI label={t('anAppr.approved')} value={overall.approved} color="text-green-600" />
                <KPI label={t('anAppr.rejected')} value={overall.rejected} color="text-red-600" />
                <KPI label={t('anAppr.pending')} value={overall.pendingReview} color="text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Trend Line */}
          {data.trend.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">{t('anAppr.dailyTrend')}</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data.trend.map(t => ({ ...t, label: format(new Date(t.date), 'MMM d', { locale: dateLocale }) }))}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="approved" stroke={COLORS.approved} name={t('anAppr.approved')} strokeWidth={2} />
                  <Line type="monotone" dataKey="rejected" stroke={COLORS.rejected} name={t('anAppr.rejected')} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* By Employee Table */}
          {data.byEmployee.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2 font-medium">{t('anAppr.byEmployee')}</p>
              <div className="overflow-auto max-h-[250px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="p-2 font-medium">{t('anAppr.employee')}</th>
                      <th className="p-2 font-medium text-center">{t('anAppr.approved')}</th>
                      <th className="p-2 font-medium text-center">{t('anAppr.rejected')}</th>
                      <th className="p-2 font-medium text-center">{t('anAppr.rate')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byEmployee.map(e => (
                      <tr key={e.employeeId} className="border-b last:border-0">
                        <td className="p-2 font-medium">{e.employeeName}</td>
                        <td className="p-2 text-center text-green-600">{e.approved}</td>
                        <td className="p-2 text-center text-red-600">{e.rejected}</td>
                        <td className="p-2 text-center">{e.approvalRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </AnalyticsSectionCard>
  );
}

function KPI({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="text-center p-2 rounded-md border">
      <p className={`text-lg font-bold ${color ?? ''}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
