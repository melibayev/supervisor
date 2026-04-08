import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Clock, MapPin, Camera, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ReviewStatusBadge } from '@/components/ReviewStatusBadge';
import { useTranslation } from '@/i18n';

export default function VisitHistory() {
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const { t, dateLocale } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ['myVisits', page],
    queryFn: () => api.getMyVisits(page, 15)
  });

  const totalPages = data ? Math.ceil(data.totalCount / 15) : 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">{t('history.title')}</h1>
        <p className="text-secondary-500">{data?.totalCount ?? 0} {t('common.total')}</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : !data?.items.length ? (
        <Card>
          <CardContent className="text-center py-12">
            <MapPin className="h-12 w-12 text-secondary-300 mx-auto mb-3" />
            <p className="font-medium text-secondary-700">{t('history.noVisits')}</p>
            <p className="text-sm text-muted-foreground">{t('history.noVisitsDesc')}</p>
            <Button className="mt-4" onClick={() => navigate('/stores')}>Go to Stores</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {data.items.map(visit => (
              <Card key={visit.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/visit/${visit.id}`)}>
                <CardContent className="flex items-center gap-4 py-4">
                  <div className={`p-2.5 rounded-full flex-shrink-0 ${
                    visit.status === 'Completed' ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    {visit.status === 'Completed' ? <CheckCircle2 className="h-5 w-5 text-green-600" /> :
                     <Clock className="h-5 w-5 text-yellow-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{visit.storeName}</p>
                      {visit.gpsVerified && <MapPin className="h-3.5 w-3.5 text-green-500" />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(visit.checkInTime), 'MMM d, yyyy · h:mm a', { locale: dateLocale })}
                      {visit.checkOutTime && ` — ${format(new Date(visit.checkOutTime), 'h:mm a', { locale: dateLocale })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Camera className="h-3.5 w-3.5" /> {visit.photos.length}</span>
                    {visit.status === 'Completed' && <ReviewStatusBadge status={visit.reviewStatus} />}
                    <Badge variant={visit.status === 'Completed' ? 'success' : 'warning'} className="text-[10px]">
                      {visit.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

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
        </>
      )}
    </div>
  );
}
