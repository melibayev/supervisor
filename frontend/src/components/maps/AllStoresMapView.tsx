import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { UserPosition } from '@/utils/geolocation'
import { formatDistance } from '@/utils/geolocation'
import { createUserLocationPlacemark, createStorePlacemark } from './yandexMapHelpers'

interface StoreWithDistance {
  id: string
  name: string
  address: string
  city: string
  latitude: number
  longitude: number
  geofenceRadius: number
  regionId: string
  distance: number | null
  geofenceStatus: { canCheckIn: boolean; label: string; color: 'green' | 'yellow' | 'red'; description: string } | null
}

interface Props {
  stores: StoreWithDistance[]
  userPosition: UserPosition | null
  selectedStoreId: string | null
  onStoreSelect: (id: string | null) => void
}

export function AllStoresMapView({ stores, userPosition, selectedStoreId, onStoreSelect }: Props) {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null)
  const ymapsRef = useRef<any>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  useEffect(() => {
    if (!mapRef.current || !window.ymaps) return

    window.ymaps.ready(() => {
      if (!mapRef.current) return
      ymapsRef.current = window.ymaps

      const map = new window.ymaps.Map(mapRef.current, {
        center: userPosition
          ? [userPosition.lat, userPosition.lng]
          : [41.2995, 69.2401],
        zoom: 12,
        controls: ['zoomControl'],
      })
      mapInstanceRef.current = map
      renderMarkers(map, window.ymaps)
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current || !ymapsRef.current) return
    renderMarkers(mapInstanceRef.current, ymapsRef.current)
  }, [stores, userPosition, selectedStoreId])

  const renderMarkers = (map: any, ym: any) => {
    markersRef.current.forEach(m => map.geoObjects.remove(m))
    markersRef.current = []

    if (userPosition) {
      const userMarker = createUserLocationPlacemark(ym, userPosition.lat, userPosition.lng)
      map.geoObjects.add(userMarker)
      markersRef.current.push(userMarker)
    }

    stores.forEach(store => {
      const pinStatus = store.geofenceStatus?.canCheckIn ? 'current' as const
        : 'pending' as const

      const marker = createStorePlacemark(ym, store, pinStatus, () => {
        onStoreSelect(store.id)
      })
      map.geoObjects.add(marker)
      markersRef.current.push(marker)
    })

    if (markersRef.current.length > 0) {
      const bounds = map.geoObjects.getBounds()
      if (bounds) {
        map.setBounds(bounds, {
          checkZoomRange: true,
          zoomMargin: 60,
          duration: 500,
        })
      }
    }
  }

  const selectedStore = stores.find(s => s.id === selectedStoreId)

  return (
    <div className="relative h-full">
      <div ref={mapRef} className="w-full h-full" />

      {/* Legend */}
      <div className="absolute top-3 left-3 bg-white rounded-xl shadow-lg border border-slate-100 p-3 space-y-1.5 z-10">
        <p className="text-xs font-semibold text-slate-600 mb-2">{t('map.legend' as any)}</p>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-violet-600" />
          <span className="text-xs text-slate-600">{t('map.pendingVisit' as any)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-xs text-slate-600">{t('map.completed' as any)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-xs text-slate-600">{t('map.you' as any)}</span>
        </div>
      </div>

      {/* Count pill */}
      <div className="absolute top-3 right-3 bg-white rounded-full shadow-lg border border-slate-100 px-3 py-1.5 z-10">
        <p className="text-xs font-semibold text-slate-700">{t('map.stores' as any).replace('{n}', String(stores.length))}</p>
      </div>

      {/* Selected store bottom card */}
      {selectedStore && (
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <div className="bg-white rounded-t-2xl shadow-2xl border-t border-slate-100 mx-0 px-5 pt-4 pb-6">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />

            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-slate-900">{selectedStore.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedStore.address}, {selectedStore.city}</p>
              </div>
              <button onClick={() => onStoreSelect(null)} className="p-1.5 rounded-lg hover:bg-slate-100">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            {selectedStore.distance != null && selectedStore.geofenceStatus && (
              <div className={`rounded-xl px-4 py-3 mb-3 border
                ${selectedStore.geofenceStatus.color === 'green'
                  ? 'bg-green-50 border-green-200'
                  : selectedStore.geofenceStatus.color === 'yellow'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-red-50 border-red-200'
                }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold
                      ${selectedStore.geofenceStatus.color === 'green' ? 'text-green-700' :
                        selectedStore.geofenceStatus.color === 'yellow' ? 'text-amber-700' :
                        'text-red-700'}`}>
                      {selectedStore.geofenceStatus.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedStore.geofenceStatus.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-900">
                      {formatDistance(selectedStore.distance)}
                    </p>
                    <p className="text-xs text-slate-400">{t('map.away' as any)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Link to={`/store/${selectedStore.id}`} className="flex-1">
                <button className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  {t('map.viewStore' as any)}
                </button>
              </Link>
              {selectedStore.geofenceStatus?.canCheckIn && (
                <Link to={`/store/${selectedStore.id}`} className="flex-1">
                  <button className="w-full py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors">
                    {t('map.startVisit' as any)}
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
