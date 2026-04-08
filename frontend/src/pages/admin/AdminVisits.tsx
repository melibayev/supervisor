import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import { useTranslation } from '@/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, Eye, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { RegionSelect } from '@/components/RegionSelect';

export default function AdminVisits() {
  const { t, dateLocale } = useTranslation();
  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const reviewFilter = searchParams.get('review') ?? '';
  const [filters, setFilters] = useState({ status: '', from: '', to: '', regionId: '' });
  const navigate = useNavigate();

  const { data: unreviewedData } = useQuery({
    queryKey: ['unreviewedCount'],
    queryFn: () => api.getUnreviewedCount()
  });

  const { data, isLoading } = useQuery({
    queryKey: ['allVisits', page, filters, reviewFilter],
    queryFn: () => api.getAllVisits(page, 20, {
      status: filters.status || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
      regionId: filters.regionId || undefined,
      reviewStatus: reviewFilter === 'unreviewed' ? 'NotReviewed' : reviewFilter === 'approved' ? 'Approved' : reviewFilter === 'rejected' ? 'Rejected' : undefined
    })
  });

  const handleReviewFilter = (v: string) => {
    setSearchParams(prev => { if (v) prev.set('review', v); else prev.delete('review'); return prev; });
    setPage(1);
  };

  const totalPages = data ? Math.ceil(data.totalCount / 20) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">{t('adminVisit.allVisits' as any)}</h1>
        <p className="text-secondary-500">{data?.totalCount ?? 0} {t('adminVisit.totalVisits' as any)}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={filters.status}
          onChange={e => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
        >
          <option value="">{t('adminVisit.allStatus' as any)}</option>
          <option value="InProgress">{t('common.inProgress')}</option>
          <option value="Completed">{t('common.completed')}</option>
        </select>
        <div className="w-48">
          <RegionSelect value={filters.regionId || 'all'} onChange={(v) => { setFilters({ ...filters, regionId: v === 'all' ? '' : v }); setPage(1); }} includeAll />
        </div>
        <Input
          type="date"
          className="w-auto"
          value={filters.from}
          onChange={e => { setFilters({ ...filters, from: e.target.value }); setPage(1); }}
        />
        <Input
          type="date"
          className="w-auto"
          value={filters.to}
          onChange={e => { setFilters({ ...filters, to: e.target.value }); setPage(1); }}
        />
      </div>

      {/* Review filter tabs */}
      <div className="flex gap-1">
        {[
          { key: '', label: t('common.all') },
          { key: 'unreviewed', label: `${t('adminVisit.needsReview')}${unreviewedData?.count ? ` (${unreviewedData.count})` : ''}` },
          { key: 'approved', label: t('common.approved') },
          { key: 'rejected', label: t('common.rejected') },
        ].map(tab => (
          <Button key={tab.key} variant={reviewFilter === tab.key ? 'default' : 'outline'} size="sm" onClick={() => handleReviewFilter(tab.key)}>
            {tab.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground bg-secondary-50">
                    <th className="p-4 font-medium">{t('common.employee')}</th>
                    <th className="p-4 font-medium">{t('common.store')}</th>
                    <th className="p-4 font-medium">{t('adminVisit.checkIn')}</th>
                    <th className="p-4 font-medium text-center">{t('adminVisit.gps')}</th>
                    <th className="p-4 font-medium text-center">{t('common.photos')}</th>
                    <th className="p-4 font-medium">{t('common.status')}</th>
                    <th className="p-4 font-medium">{t('adminVisit.review')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.items.map(visit => {
                    return (
                      <tr key={visit.id} className="border-b last:border-0 hover:bg-secondary-50 cursor-pointer" onClick={() => navigate(`/visit/${visit.id}`)}>
                        <td className="p-4 font-medium">{visit.userName}</td>
                        <td className="p-4 text-muted-foreground">{visit.storeName}</td>
                        <td className="p-4 text-muted-foreground text-xs">{format(new Date(visit.checkInTime), 'MMM d, h:mm a', { locale: dateLocale })}</td>
                        <td className="p-4 text-center">
                          {visit.gpsVerified ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-500 mx-auto" />
                          )}
                        </td>
                        <td className="p-4 text-center">{visit.photos.length}</td>
                        <td className="p-4">
                          <Badge variant={visit.status === 'Completed' ? 'success' : 'warning'}>
                            {visit.status === 'Completed' ? t('common.completed') : visit.status === 'InProgress' ? t('common.inProgress') : visit.status}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {visit.reviewStatus === 'Approved' && <Badge variant="success" className="gap-1"><ThumbsUp className="h-3 w-3" /> {t('common.approved')}</Badge>}
                          {visit.reviewStatus === 'Rejected' && <Badge variant="destructive" className="gap-1"><ThumbsDown className="h-3 w-3" /> {t('common.rejected')}</Badge>}
                          {!visit.reviewStatus && visit.status === 'Completed' && <Badge variant="secondary" className="gap-1"><Eye className="h-3 w-3" /> {t('common.pending')}</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{t('common.page')} {page} {t('common.of')} {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Visit Review Dialog */}
    </div>
  );
}
