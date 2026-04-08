import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Navigation, Loader2, Search, List, Map as MapIcon, AlertCircle, Layers } from 'lucide-react';
import { useLocateMe } from '@/hooks/useLocateMe';
import { getDistanceMeters, getGeofenceStatus, formatDistance } from '@/utils/geolocation';
import { AllStoresMapView } from '@/components/maps/AllStoresMapView';
import { SingleStoreMapView } from '@/components/maps/SingleStoreMapView';
import { StoreListCard } from '@/components/maps/StoreListCard';
import { useTranslation } from '@/i18n';

export default function MyStores() {
  const [view, setView] = useState<'list' | 'map'>('list');
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [mapStoreId, setMapStoreId] = useState<string | null>(null); // which store's map to show (null = all)
  const [searchQuery, setSearchQuery] = useState('');
  const { status, position, error, isLoading: locating, locateOnce } = useLocateMe();
  const { t } = useTranslation();

  const { data: stores, isLoading } = useQuery({
    queryKey: ['myStores'],
    queryFn: () => api.getMyStores()
  });

  const storesWithDistance = useMemo(() => {
    if (!stores) return [];
    return stores
      .map(s => {
        const dist = position
          ? getDistanceMeters(position.lat, position.lng, s.latitude, s.longitude)
          : null;
        return {
          ...s,
          distance: dist,
          geofenceStatus: dist !== null ? getGeofenceStatus(dist, s.geofenceRadius, t as (key: string) => string) : null,
        };
      })
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }, [stores, position]);

  const filteredStores = useMemo(() => {
    if (!searchQuery.trim()) return storesWithDistance;
    const q = searchQuery.toLowerCase();
    return storesWithDistance.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.address.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q)
    );
  }, [storesWithDistance, searchQuery]);

  // Locate a specific store — shows user + that one store on map
  const handleLocateStore = async (storeId: string) => {
    await locateOnce();
    setMapStoreId(storeId);
    setView('map');
  };

  // Show all stores on map
  const handleShowAll = async () => {
    await locateOnce();
    setMapStoreId(null);
    setView('map');
  };

  // The store currently focused on the single-store map
  const focusedStore = mapStoreId ? storesWithDistance.find(s => s.id === mapStoreId) : null;
  const focusedDistance = focusedStore?.distance ?? null;
  const focusedGeofence = focusedStore?.geofenceStatus ?? null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{t('myStores.title')}</h1>
            <p className="text-xs text-slate-500">{stores?.length ?? 0} assigned stores</p>
          </div>
          <button
            onClick={handleShowAll}
            disabled={locating}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
              transition-all duration-200 shadow-sm
              ${locating
                ? 'bg-violet-100 text-violet-400 cursor-not-allowed'
                : 'bg-violet-600 text-white hover:bg-violet-700 active:scale-95'
              }
            `}
          >
            {locating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Locating...</>
            ) : (
              <><Layers className="w-4 h-4" /> Show All</>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search stores..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-100 rounded-xl border-0 focus:ring-2 focus:ring-violet-500 outline-none"
            />
          </div>
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${view === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button
              onClick={() => setView('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${view === 'map' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <MapIcon className="w-3.5 h-3.5" /> Map
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-red-700">Location Error</p>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          </div>
        )}

        {position && (
          <div className="mt-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <p className="text-xs text-green-700 font-medium">
              Location found &bull; Accuracy &plusmn;{Math.round(position.accuracy)}m
            </p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'map' ? (
          mapStoreId && focusedStore && position && focusedDistance !== null && focusedGeofence ? (
            /* Single store map — user + one store + distance line */
            <div className="h-full overflow-y-auto">
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-700">{focusedStore.name}</p>
                  <button
                    onClick={() => setMapStoreId(null)}
                    className="text-xs text-violet-600 font-medium hover:text-violet-700"
                  >
                    ← Show All Stores
                  </button>
                </div>
                <SingleStoreMapView
                  store={focusedStore}
                  userPosition={position}
                  distance={focusedDistance}
                  geofenceStatus={focusedGeofence}
                />
              </div>
            </div>
          ) : (
            /* All stores map */
            <AllStoresMapView
              stores={filteredStores}
              userPosition={position}
              selectedStoreId={selectedStoreId}
              onStoreSelect={setSelectedStoreId}
            />
          )
        ) : (
          <div className="overflow-y-auto h-full px-4 py-3 space-y-3">
            {filteredStores.length > 0 ? (
              filteredStores.map(store => (
                <StoreListCard
                  key={store.id}
                  store={store}
                  hasLocation={!!position}
                  onLocateMeClick={() => handleLocateStore(store.id)}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="font-medium text-slate-700">{t('common.noResults')}</p>
                <p className="text-sm text-slate-400">
                  {searchQuery ? 'Try a different search term.' : 'Contact your admin to get stores assigned.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
