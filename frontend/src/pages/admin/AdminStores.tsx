import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useTranslation } from '@/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { MapPin, Search, Plus, Loader2, Store as StoreIcon } from 'lucide-react';
import { RegionBadge } from '@/components/RegionBadge';
import { RegionSelect } from '@/components/RegionSelect';
import { UZBEKISTAN_REGIONS } from '@/constants/regions';
import type { Store } from '@/types';

declare global {
  interface Window { ymaps: any; }
}

function YandexMapPicker({ lat, lng, onPick }: { lat: number; lng: number; onPick: (lat: number, lng: number) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const initMap = useCallback(() => {
    if (!containerRef.current || !window.ymaps) return;

    if (mapRef.current) {
      mapRef.current.destroy();
      mapRef.current = null;
    }

    window.ymaps.ready(() => {
      const map = new window.ymaps.Map(containerRef.current, {
        center: [lat, lng],
        zoom: 14,
        controls: ['zoomControl', 'searchControl']
      });

      const marker = new window.ymaps.Placemark([lat, lng], {}, {
        draggable: true,
        preset: 'islands#redDotIcon'
      });

      marker.events.add('dragend', () => {
        const coords = marker.geometry.getCoordinates();
        onPick(coords[0], coords[1]);
      });

      map.events.add('click', (e: any) => {
        const coords = e.get('coords');
        marker.geometry.setCoordinates(coords);
        onPick(coords[0], coords[1]);
      });

      map.geoObjects.add(marker);
      mapRef.current = map;
      markerRef.current = marker;
    });
  }, []); // intentionally stable - we init once

  useEffect(() => {
    initMap();
    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [initMap]);

  // Update marker when lat/lng props change externally
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.geometry.setCoordinates([lat, lng]);
    }
    if (mapRef.current) {
      mapRef.current.setCenter([lat, lng]);
    }
  }, [lat, lng]);

  return <div ref={containerRef} className="w-full h-[300px] rounded-lg border" />;
}

/* ── Main Component ────────────────────────────────────────── */
export default function AdminStores() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', city: 'Tashkent', latitude: 41.3, longitude: 69.24, geofenceRadius: 50, regionId: 'tashkent', regionName: 'Tashkent' });

  const { data, isLoading } = useQuery({
    queryKey: ['allStores', page, search, regionFilter],
    queryFn: () => api.getAllStores(page, 20, search || undefined, regionFilter !== 'all' ? regionFilter : undefined)
  });

  const createMutation = useMutation({
    mutationFn: () => api.createStore(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allStores'] });
      setShowCreateDialog(false);
      setForm({ name: '', address: '', city: 'Tashkent', latitude: 41.3, longitude: 69.24, geofenceRadius: 50, regionId: 'tashkent', regionName: 'Tashkent' });
    }
  });

  const handleRegionChange = (regionId: string, setter: (fn: (prev: any) => any) => void) => {
    const region = UZBEKISTAN_REGIONS.find((r) => r.id === regionId);
    setter((prev: any) => ({ ...prev, regionId, regionName: region?.name ?? regionId }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">{t('adminStore.title')}</h1>
          <p className="text-secondary-500">{data?.totalCount ?? 0} {t('adminStore.stores' as any)}</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" /> {t('adminStore.addStore')}
        </Button>
      </div>

      <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative max-w-sm flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t('adminStore.searchStores')} className="pl-9" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <div className="w-48">
              <RegionSelect value={regionFilter} onChange={(v) => { setRegionFilter(v); setPage(1); }} includeAll />
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-36" />)}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.items.map(store => (
                <Card key={store.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/admin/stores/${store.id}`)}>
                  <CardContent className="py-5">
                    <div className="flex items-start gap-3">
                      <div className="p-3 bg-secondary-100 rounded-xl flex-shrink-0">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold truncate">{store.name}</p>
                          <RegionBadge regionId={store.regionId} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{store.address}, {store.city}</p>
                        <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                          <span>{store.assignedEmployees} {t('adminStore.employees' as any)}</span>
                          <span>{store.totalVisits} {t('adminStore.visits' as any)}</span>
                          <span>{store.geofenceRadius}m {t('adminStore.radius' as any)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
      </div>

      {/* Create Store Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{t('adminStore.addNewStore' as any)}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('adminStore.storeName')}</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>{t('common.city')}</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t('common.address')}</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>{t('common.region')}</Label><RegionSelect value={form.regionId} onChange={(v) => handleRegionChange(v, setForm)} required /></div>
            </div>

            <div>
              <Label className="mb-2 block">{t('adminStore.pickLocation' as any)}</Label>
              <YandexMapPicker
                lat={form.latitude}
                lng={form.longitude}
                onPick={(lat, lng) => setForm(f => ({ ...f, latitude: Math.round(lat * 10000) / 10000, longitude: Math.round(lng * 10000) / 10000 }))}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div><Label>{t('adminStore.latitude')}</Label><Input type="number" step="0.0001" value={form.latitude} onChange={e => setForm({ ...form, latitude: Number(e.target.value) })} /></div>
              <div><Label>{t('adminStore.longitude')}</Label><Input type="number" step="0.0001" value={form.longitude} onChange={e => setForm({ ...form, longitude: Number(e.target.value) })} /></div>
              <div><Label>{t('adminStore.geofenceRadius')}</Label><Input type="number" min={10} value={form.geofenceRadius} onChange={e => setForm({ ...form, geofenceRadius: Number(e.target.value) })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.name || !form.address || !form.regionId}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t('adminStore.createStore' as any)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
