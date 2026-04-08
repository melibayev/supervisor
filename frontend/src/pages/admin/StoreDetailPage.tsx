import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RegionBadge } from '@/components/RegionBadge';
import { RegionSelect } from '@/components/RegionSelect';
import { UZBEKISTAN_REGIONS } from '@/constants/regions';
import {
  ChevronLeft, Clock, Calendar, Pencil, Trash2, MapPin,
  CheckCircle, XCircle, ThumbsUp, ThumbsDown, Loader2, Users, Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { StoreVisitHistoryTab } from '@/components/stores/StoreVisitHistoryTab';
import { StoreScheduleTab } from '@/components/stores/StoreScheduleTab';
import { useTranslation } from '@/i18n';
import type { StoreDetail, StoreDetailStats } from '@/types';

declare global {
  interface Window { ymaps: any; }
}

function StoreDetailSkeleton() {
  return (
    <div className="space-y-6 pb-10">
      <Skeleton className="h-5 w-36" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}

function StoreStatsRow({ stats }: { stats: StoreDetailStats }) {
  const { t } = useTranslation();
  const items = [
    { label: t('sDetail.totalVisits' as any), value: stats.totalVisits, icon: <Eye className="w-4 h-4" />, bg: 'bg-violet-50 dark:bg-violet-500/10', iconBg: 'bg-violet-100 dark:bg-violet-500/20', color: 'text-violet-700 dark:text-violet-400' },
    { label: t('sDetail.completedVisits' as any), value: stats.completedVisits, icon: <CheckCircle className="w-4 h-4" />, bg: 'bg-green-50 dark:bg-green-500/10', iconBg: 'bg-green-100 dark:bg-green-500/20', color: 'text-green-700 dark:text-green-400' },
    { label: t('sDetail.approvedVisits' as any), value: stats.approvedVisits, icon: <ThumbsUp className="w-4 h-4" />, bg: 'bg-blue-50 dark:bg-blue-500/10', iconBg: 'bg-blue-100 dark:bg-blue-500/20', color: 'text-blue-700 dark:text-blue-400' },
    { label: t('sDetail.rejectedVisits' as any), value: stats.rejectedVisits, icon: <ThumbsDown className="w-4 h-4" />, bg: 'bg-red-50 dark:bg-red-500/10', iconBg: 'bg-red-100 dark:bg-red-500/20', color: 'text-red-700 dark:text-red-400' },
    { label: t('sDetail.missedSchedules' as any), value: stats.missedSchedules, icon: <XCircle className="w-4 h-4" />, bg: 'bg-orange-50 dark:bg-orange-500/10', iconBg: 'bg-orange-100 dark:bg-orange-500/20', color: 'text-orange-700 dark:text-orange-400' },
    { label: t('sDetail.pendingSchedules' as any), value: stats.pendingSchedules, icon: <Clock className="w-4 h-4" />, bg: 'bg-amber-50 dark:bg-amber-500/10', iconBg: 'bg-amber-100 dark:bg-amber-500/20', color: 'text-amber-700 dark:text-amber-400' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map(item => (
        <div key={item.label} className={`${item.bg} rounded-2xl p-4 border border-white dark:border-slate-800`}>
          <div className={`w-8 h-8 ${item.iconBg} rounded-xl flex items-center justify-center ${item.color} mb-3`}>
            {item.icon}
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{item.value}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.label}</p>
        </div>
      ))}
    </div>
  );
}

function YandexMapPicker({ lat, lng, onPick }: { lat: number; lng: number; onPick: (lat: number, lng: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const initMap = useCallback(() => {
    if (!containerRef.current || !window.ymaps) return;
    if (mapRef.current) { mapRef.current.destroy(); mapRef.current = null; }
    window.ymaps.ready(() => {
      const map = new window.ymaps.Map(containerRef.current, { center: [lat, lng], zoom: 14, controls: ['zoomControl', 'searchControl'] });
      const marker = new window.ymaps.Placemark([lat, lng], {}, { draggable: true, preset: 'islands#redDotIcon' });
      marker.events.add('dragend', () => { const coords = marker.geometry.getCoordinates(); onPick(coords[0], coords[1]); });
      map.events.add('click', (e: any) => { const coords = e.get('coords'); marker.geometry.setCoordinates(coords); onPick(coords[0], coords[1]); });
      map.geoObjects.add(marker);
      mapRef.current = map;
      markerRef.current = marker;
    });
  }, []);

  useEffect(() => { initMap(); return () => { if (mapRef.current) { mapRef.current.destroy(); mapRef.current = null; } }; }, [initMap]);
  useEffect(() => { if (markerRef.current) markerRef.current.geometry.setCoordinates([lat, lng]); if (mapRef.current) mapRef.current.setCenter([lat, lng]); }, [lat, lng]);

  return <div ref={containerRef} className="w-full h-[300px] rounded-lg border" />;
}

export default function StoreDetailPage() {
  const { t, dateLocale } = useTranslation();
  const { storeId } = useParams<{ storeId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const activeTab = searchParams.get('tab') ?? 'visits';

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: store, isLoading } = useQuery({
    queryKey: ['store-detail', storeId],
    queryFn: () => api.getStoreDetail(storeId!),
    enabled: !!storeId,
  });

  const handleTabChange = (tab: string) => {
    setSearchParams(prev => {
      prev.set('tab', tab);
      prev.delete('page');
      prev.delete('schedulePage');
      return prev;
    });
  };

  if (isLoading) return <StoreDetailSkeleton />;
  if (!store) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <XCircle className="w-12 h-12 text-slate-300 mb-4" />
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">{t('sDetail.notFound' as any)}</h2>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/admin/stores')}>
          {t('sDetail.backToStores' as any)}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Back button */}
      <button
        onClick={() => navigate('/admin/stores')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors group"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        {t('sDetail.backToStores' as any)}
      </button>

      {/* Store Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary to-primary/70" />
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
            {/* Icon */}
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{store.name}</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <RegionBadge regionId={store.regionId} />
                    <span className="text-xs text-slate-500">{store.city}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="flex items-center gap-1.5 text-xs sm:text-sm">
                    <Pencil className="w-3.5 h-3.5" /> {t('sDetail.edit' as any)}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)} className="flex items-center gap-1.5 text-xs sm:text-sm border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-800 dark:hover:bg-red-500/10">
                    <Trash2 className="w-3.5 h-3.5" /> {t('common.delete')}
                  </Button>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <span className="truncate">{store.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <span>{store.stats.assignedEmployees} {t('sDetail.assignedEmployees' as any)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <span>{t('sDetail.created' as any)} {format(new Date(store.createdAt), 'MMM d, yyyy', { locale: dateLocale })}</span>
                </div>
              </div>

              {/* Geofence info */}
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
                <span>{t('sDetail.geofence' as any)}: {store.geofenceRadius}m</span>
                <span>Lat: {store.latitude.toFixed(4)}</span>
                <span>Lng: {store.longitude.toFixed(4)}</span>
              </div>

              {/* Assigned employees */}
              {store.assignedEmployees.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-slate-500 mb-2">{t('sDetail.assignedEmployeesList' as any)} ({store.assignedEmployees.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {store.assignedEmployees.map(emp => (
                      <button
                        key={emp.id}
                        onClick={() => navigate(`/admin/employees/${emp.id}`)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        {emp.avatarUrl ? (
                          <img src={emp.avatarUrl} alt={emp.fullName} className="w-4 h-4 rounded-full object-cover" />
                        ) : (
                          <Users className="w-3 h-3" />
                        )}
                        {emp.fullName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <StoreStatsRow stats={store.stats} />

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 overflow-x-auto">
          <div className="flex gap-0">
            <button
              onClick={() => handleTabChange('visits')}
              className={`px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                activeTab === 'visits' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {t('sDetail.visitHistoryTab' as any)}
            </button>
            <button
              onClick={() => handleTabChange('schedule')}
              className={`px-3 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                activeTab === 'schedule' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {t('sDetail.scheduledVisitsTab' as any)}
              {store.stats.pendingSchedules > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold px-1">
                  {store.stats.pendingSchedules}
                </span>
              )}
            </button>
          </div>
        </div>
        <div className="p-3 sm:p-6">
          {activeTab === 'visits' && <StoreVisitHistoryTab storeId={storeId!} />}
          {activeTab === 'schedule' && <StoreScheduleTab storeId={storeId!} />}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <EditStoreModal store={store} onClose={() => setIsEditing(false)} />
      )}

      {/* Delete Dialog */}
      <DeleteStoreDialog
        store={store}
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onDeleted={() => navigate('/admin/stores')}
      />
    </div>
  );
}

/* ── Edit Store Modal ── */
function EditStoreModal({ store, onClose }: { store: StoreDetail; onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: store.name,
    address: store.address,
    city: store.city,
    latitude: store.latitude,
    longitude: store.longitude,
    geofenceRadius: store.geofenceRadius,
    regionId: store.regionId,
    regionName: store.regionName,
  });

  const updateMutation = useMutation({
    mutationFn: () => api.updateStore(store.id, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-detail', store.id] });
      queryClient.invalidateQueries({ queryKey: ['allStores'] });
      onClose();
    },
  });

  const handleRegionChange = (regionId: string) => {
    const region = UZBEKISTAN_REGIONS.find(r => r.id === regionId);
    setForm(prev => ({ ...prev, regionId, regionName: region?.name ?? regionId }));
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" /> {t('adminStore.editStore')}
          </DialogTitle>
          <DialogDescription>{t('sDetail.updateInfo' as any).replace('{name}', store.name)}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>{t('adminStore.storeName')}</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>{t('common.city')}</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label>{t('common.address')}</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>{t('common.region')}</Label><RegionSelect value={form.regionId} onChange={handleRegionChange} required /></div>
          </div>

          <div>
            <Label className="mb-2 block">{t('adminStore.pickLocation' as any)}</Label>
            <YandexMapPicker
              lat={form.latitude}
              lng={form.longitude}
              onPick={(lat, lng) => setForm(f => ({ ...f, latitude: Math.round(lat * 10000) / 10000, longitude: Math.round(lng * 10000) / 10000 }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><Label>{t('adminStore.latitude')}</Label><Input type="number" step="0.0001" value={form.latitude} onChange={e => setForm({ ...form, latitude: Number(e.target.value) })} /></div>
            <div><Label>{t('adminStore.longitude')}</Label><Input type="number" step="0.0001" value={form.longitude} onChange={e => setForm({ ...form, longitude: Number(e.target.value) })} /></div>
            <div><Label>{t('adminStore.geofenceRadius')}</Label><Input type="number" min={10} value={form.geofenceRadius} onChange={e => setForm({ ...form, geofenceRadius: Number(e.target.value) })} /></div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" type="button" onClick={onClose} disabled={updateMutation.isPending}>{t('common.cancel')}</Button>
          <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending || !form.name || !form.address || !form.regionId}>
            {updateMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> {t('sDetail.saving' as any)}</> : t('common.saveChanges')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── Delete Store Dialog ── */
function DeleteStoreDialog({ store, open, onClose, onDeleted }: {
  store: StoreDetail; open: boolean; onClose: () => void; onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [confirmText, setConfirmText] = useState('');

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteStore(store.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allStores'] });
      queryClient.removeQueries({ queryKey: ['store-detail', store.id] });
      onDeleted();
    },
  });

  const isConfirmed = confirmText === store.name;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="w-5 h-5" /> {t('adminStore.deleteStore')}
          </DialogTitle>
          <DialogDescription>{t('sDetail.cannotUndo' as any)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-red-800 dark:text-red-400 mb-1">{t('sDetail.aboutToDelete' as any)}</p>
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">{store.name}</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{store.address}, {store.city}</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{t('sDetail.thisWill' as any)}</p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li className="flex items-center gap-1.5"><XCircle className="w-3 h-3 text-red-500 flex-shrink-0" /> {t('sDetail.removeAllAssignments' as any)}</li>
              <li className="flex items-center gap-1.5"><XCircle className="w-3 h-3 text-red-500 flex-shrink-0" /> {t('sDetail.deleteAllData' as any)}</li>
            </ul>
          </div>
          <div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-1.5">
              {t('sDetail.typeName' as any)} <span className="font-semibold text-slate-900 dark:text-white">{store.name}</span> {t('sDetail.typeNameToConfirm' as any)}
            </p>
            <Input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder={store.name} className="border-red-200 focus:ring-red-500" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={deleteMutation.isPending}>{t('common.cancel')}</Button>
          <Button variant="destructive" disabled={!isConfirmed || deleteMutation.isPending} onClick={() => deleteMutation.mutate()}>
            {deleteMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> {t('sDetail.deleting' as any)}</> : t('adminStore.deleteStore')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
