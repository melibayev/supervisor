import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useLocateMe } from '@/hooks/useLocateMe';
import { useGeolocation } from '@/hooks/useGeolocation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Navigation, ArrowLeft, Loader2, AlertCircle, Clock, CheckCircle2, CalendarClock, ShieldCheck, ShieldX, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { DueDateBadge } from '@/components/DueDateBadge';
import { getDistanceMeters, getGeofenceStatus } from '@/utils/geolocation';
import { SingleStoreMapView } from '@/components/maps/SingleStoreMapView';
import { useTranslation } from '@/i18n';

export default function StoreDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const geo = useGeolocation();
  const [starting, setStarting] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const { status: locateStatus, position: locatePosition, error: locateError, isLoading: locating, locateOnce } = useLocateMe();
  const { t, dateLocale } = useTranslation();

  const { data: stores } = useQuery({
    queryKey: ['myStores'],
    queryFn: () => api.getMyStores()
  });

  const { data: activeVisit } = useQuery({
    queryKey: ['activeVisit'],
    queryFn: () => api.getActiveVisit()
  });

  const { data: history } = useQuery({
    queryKey: ['storeVisitHistory', id],
    queryFn: () => api.getMyVisits(1, 10)
  });

  const { data: mySchedules } = useQuery({
    queryKey: ['mySchedules'],
    queryFn: () => api.getMySchedules()
  });

  const startVisitMutation = useMutation({
    mutationFn: async () => {
      const pos = await geo.getCurrentPosition();
      return api.startVisit(id!, pos.latitude, pos.longitude);
    },
    onSuccess: (visit) => {
      queryClient.invalidateQueries({ queryKey: ['activeVisit'] });
      navigate(`/visit/${visit.id}`);
    }
  });

  const store = stores?.find(s => s.id === id);
  const storeVisits = history?.items.filter(v => v.storeId === id) ?? [];

  const mapDistance = useMemo(() => {
    if (!locatePosition || !store) return null;
    return getDistanceMeters(locatePosition.lat, locatePosition.lng, store.latitude, store.longitude);
  }, [locatePosition, store]);

  const mapGeofenceStatus = useMemo(() => {
    if (mapDistance === null || !store) return null;
    return getGeofenceStatus(mapDistance, store.geofenceRadius, t as (key: string) => string);
  }, [mapDistance, store]);

  // Employee must locate themselves first AND be inside geofence to start
  const canStart = mapGeofenceStatus?.canCheckIn === true;

  const handleStartVisit = async () => {
    if (!canStart) return;
    setStarting(true);
    try {
      await startVisitMutation.mutateAsync();
    } catch {
      // error handled by mutation
    } finally {
      setStarting(false);
    }
  };

  const handleLocateMeMap = async () => {
    await locateOnce();
    setShowMap(true);
  };

  if (!store) {
    return (
      <div className="max-w-4xl space-y-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="text-center py-12 text-muted-foreground">{t('storeDetail.notFound')}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-secondary-900">{store.name}</h1>
          <p className="text-sm text-muted-foreground">{store.address}, {store.city}</p>
        </div>
      </div>

      {/* Store info card */}
      <Card>
        <CardContent className="py-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-xl ${mapGeofenceStatus?.canCheckIn ? 'bg-green-100' : 'bg-secondary-100'}`}>
              <MapPin className={`h-6 w-6 ${mapGeofenceStatus?.canCheckIn ? 'text-green-600' : 'text-secondary-500'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold">{store.name}</p>
                {mapGeofenceStatus?.canCheckIn && <Badge variant="success">{t('storeDetail.inRange')}</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{store.address}, {store.city}</p>
              {mapDistance !== null && (
                <p className="text-sm text-secondary-500 mt-1">
                  {mapDistance < 1000 ? `${mapDistance.toFixed(0)}m` : `${(mapDistance / 1000).toFixed(1)}km`} {t('storeDetail.away')}
                  <span className="text-xs ml-2 text-muted-foreground">({store.geofenceRadius}m {t('storeDetail.geofence')})</span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-secondary-50 rounded-lg py-3">
              <p className="text-lg font-bold">{store.assignedEmployees}</p>
              <p className="text-xs text-muted-foreground">{t('storeDetail.employees')}</p>
            </div>
            <div className="bg-secondary-50 rounded-lg py-3">
              <p className="text-lg font-bold">{store.totalVisits}</p>
              <p className="text-xs text-muted-foreground">{t('storeDetail.totalVisits')}</p>
            </div>
            <div className="bg-secondary-50 rounded-lg py-3">
              <p className="text-lg font-bold">{store.geofenceRadius}m</p>
              <p className="text-xs text-muted-foreground">{t('storeDetail.radiusLabel')}</p>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* GPS error */}
      {locateError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700">{t('storeDetail.locationError')}</p>
            <p className="text-xs text-red-600">{locateError}</p>
          </div>
        </div>
      )}

      {/* Map — only shown after Locate Me is clicked and position is available */}
      {showMap && locatePosition && mapDistance !== null && mapGeofenceStatus && (
        <SingleStoreMapView
          store={store}
          userPosition={locatePosition}
          distance={mapDistance}
          geofenceStatus={mapGeofenceStatus}
        />
      )}

      {/* Error */}
      {startVisitMutation.isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {(startVisitMutation.error as Error)?.message || t('storeDetail.failedToStart')}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleLocateMeMap}
          disabled={locating}
          className={`
            flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
            transition-all duration-200 shadow-sm justify-center
            ${locating
              ? 'bg-violet-100 text-violet-400 cursor-not-allowed'
              : showMap && locatePosition
              ? 'bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100'
              : 'bg-violet-600 text-white hover:bg-violet-700 active:scale-95'
            }
          `}
        >
          {locating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> {t('storeDetail.locating')}</>
          ) : showMap && locatePosition ? (
            <><RefreshCw className="w-4 h-4" /> {t('storeDetail.updateLocation')}</>
          ) : (
            <><Navigation className="w-4 h-4" /> {t('storeDetail.locateMe')}</>
          )}
        </button>

        {activeVisit ? (
          activeVisit.storeId === id ? (
            <Button className="flex-1" onClick={() => navigate(`/visit/${activeVisit.id}`)}>
              <Navigation className="h-4 w-4 mr-2" /> {t('storeDetail.continueVisit')}
            </Button>
          ) : (
            <Button className="flex-1" disabled>
              {t('storeDetail.visitActiveOther')}
            </Button>
          )
        ) : (
          <Button
            className="flex-1"
            onClick={handleStartVisit}
            disabled={starting || !canStart}
            variant={canStart ? 'default' : 'outline'}
          >
            {starting ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {t('storeDetail.starting')}</>
            ) : (
              <><CheckCircle2 className="h-4 w-4 mr-2" /> {t('storeDetail.startVisit')}</>
            )}
          </Button>
        )}
      </div>

      {/* GPS proximity warning */}
      {!activeVisit && !canStart && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <MapPin className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {!locatePosition
                ? t('storeDetail.locationRequired')
                : t('storeDetail.tooFar')}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              {!locatePosition
                ? t('storeDetail.tapLocateFirst')
                : `${mapDistance! < 1000 ? Math.round(mapDistance!) + 'm' : (mapDistance! / 1000).toFixed(1) + 'km'} ${t('storeDetail.goToStoreAndUpdate')}`}
            </p>
          </div>
        </div>
      )}

      {/* Pending Schedules for this store */}
      {(() => {
        const storeSchedules = (mySchedules ?? []).filter(s => s.storeId === id && s.status === 'Pending');
        return storeSchedules.length > 0 ? (
          <div>
            <h2 className="text-sm font-semibold text-secondary-700 mb-3 flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> {t('storeDetail.upcomingDeadlines')}
            </h2>
            <div className="space-y-2">
              {storeSchedules.map(s => (
                <Card key={s.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                      <DueDateBadge dueDate={s.dueDate} />
                      {s.adminNotes && <span className="text-xs text-muted-foreground">{s.adminNotes}</span>}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* Recent visits at this store */}
      {storeVisits.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-secondary-700 mb-3">{t('storeDetail.recentVisits')}</h2>
          <div className="space-y-2">
            {storeVisits.map(visit => (
              <Card key={visit.id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => navigate(`/visit/${visit.id}`)}>
                <CardContent className="flex items-center gap-3 py-3">
                  <div className={`p-2 rounded-full ${
                    visit.status === 'Completed' ? 'bg-green-100' : 'bg-yellow-100'
                  }`}>
                    {visit.status === 'Completed' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                     <Clock className="h-4 w-4 text-yellow-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{format(new Date(visit.checkInTime), 'MMM d, yyyy · h:mm a', { locale: dateLocale })}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">{visit.photos.length} photos · {visit.products.length} products</p>
                      {visit.reviewStatus === 'Approved' && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-green-600"><ShieldCheck className="h-3 w-3" /> Approved</span>
                      )}
                      {visit.reviewStatus === 'Rejected' && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-600"><ShieldX className="h-3 w-3" /> Rejected</span>
                      )}
                    </div>
                  </div>
                  <Badge variant={visit.status === 'Completed' ? 'success' : 'warning'}>
                    {visit.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
