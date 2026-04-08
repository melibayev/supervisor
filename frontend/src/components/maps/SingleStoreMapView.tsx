import { useEffect, useRef } from 'react'
import { useTranslation } from '@/i18n'
import { UserPosition, formatDistance } from '@/utils/geolocation'
import { createUserLocationPlacemark, createStorePlacemark, createGeofenceCircle } from './yandexMapHelpers'

interface Props {
  store: { name: string; address: string; latitude: number; longitude: number; geofenceRadius: number }
  userPosition: UserPosition
  distance: number
  geofenceStatus: { canCheckIn: boolean; label: string; color: 'green' | 'yellow' | 'red'; description: string }
}

export function SingleStoreMapView({ store, userPosition, distance, geofenceStatus }: Props) {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (!mapRef.current || !window.ymaps) return

    window.ymaps.ready(() => {
      if (!mapRef.current) return

      const centerLat = (userPosition.lat + store.latitude) / 2
      const centerLng = (userPosition.lng + store.longitude) / 2

      const map = new window.ymaps.Map(mapRef.current, {
        center: [centerLat, centerLng],
        zoom: 15,
        controls: ['zoomControl'],
      })
      mapInstanceRef.current = map

      // Geofence circle
      const circle = createGeofenceCircle(window.ymaps, store, distance)
      map.geoObjects.add(circle)

      // Store marker
      const storeMark = createStorePlacemark(window.ymaps, store, 'current')
      map.geoObjects.add(storeMark)

      // User marker
      const userMark = createUserLocationPlacemark(window.ymaps, userPosition.lat, userPosition.lng)
      map.geoObjects.add(userMark)

      // Dashed line connecting user to store
      const line = new window.ymaps.Polyline(
        [[userPosition.lat, userPosition.lng], [store.latitude, store.longitude]],
        {},
        {
          strokeColor: '#7C3AED',
          strokeWidth: 2,
          strokeStyle: 'dash',
          opacity: 0.5,
        }
      )
      map.geoObjects.add(line)

      // Auto-fit bounds
      const bounds = map.geoObjects.getBounds()
      if (bounds) {
        map.setBounds(bounds, {
          checkZoomRange: true,
          zoomMargin: 60,
          duration: 600,
        })
      }
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.destroy()
        mapInstanceRef.current = null
      }
    }
  }, [userPosition, store, distance])

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Distance status bar */}
      <div className={`px-4 py-3 flex items-center justify-between border-b
        ${geofenceStatus.color === 'green'  ? 'bg-green-50  border-green-200'  :
          geofenceStatus.color === 'yellow' ? 'bg-amber-50  border-amber-200'  :
                                              'bg-red-50    border-red-200'}`}>
        <div>
          <p className={`text-sm font-bold
            ${geofenceStatus.color === 'green'  ? 'text-green-700'  :
              geofenceStatus.color === 'yellow' ? 'text-amber-700'  :
                                                   'text-red-700'}`}>
            {geofenceStatus.label}
          </p>
          <p className={`text-xs mt-0.5
            ${geofenceStatus.color === 'green'  ? 'text-green-600'  :
              geofenceStatus.color === 'yellow' ? 'text-amber-600'  :
                                                   'text-red-600'}`}>
            {geofenceStatus.description}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black text-slate-900">
            {formatDistance(distance)}
          </p>
          <p className="text-xs text-slate-400">{t('map.fromStore' as any)}</p>
        </div>
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ height: 280 }} className="w-full" />

      {/* Map info footer */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full border-2 border-dashed border-violet-500" />
            {t('map.geofence' as any).replace('{r}', String(store.geofenceRadius))}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-violet-600" />
            {t('map.you' as any)}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-red-600" />
            {t('map.store' as any)}
          </span>
        </div>
        <span>{t('map.accuracy' as any).replace('{n}', String(Math.round(userPosition.accuracy)))}</span>
      </div>
    </div>
  )
}
