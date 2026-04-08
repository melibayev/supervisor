import { useNavigate } from 'react-router-dom'
import { MapPin, Navigation, CheckCircle, Clock, XCircle, ChevronRight } from 'lucide-react'
import { useTranslation } from '@/i18n'
import { RegionBadge } from '@/components/RegionBadge'
import { formatDistance } from '@/utils/geolocation'

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
  store: StoreWithDistance
  hasLocation: boolean
  onLocateMeClick: () => void
}

export function StoreListCard({ store, hasLocation, onLocateMeClick }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate()
  const status = store.geofenceStatus

  return (
    <div
      className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
      onClick={() => navigate(`/store/${store.id}`)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-3">
            <p className="font-semibold text-slate-900 text-sm">{store.name}</p>
            <p className="text-xs text-slate-500 mt-0.5 truncate">{store.address}, {store.city}</p>
            <RegionBadge regionId={store.regionId} className="mt-2" />
          </div>

          <div className="flex-shrink-0 flex items-center gap-2">
            {store.distance != null && (
              <div className={`flex flex-col items-center px-3 py-2 rounded-xl border
                ${status?.color === 'green'
                  ? 'bg-green-50 border-green-200'
                  : status?.color === 'yellow'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-red-50 border-red-200'}`}>
                <span className={`text-lg font-bold
                  ${status?.color === 'green' ? 'text-green-700' :
                    status?.color === 'yellow' ? 'text-amber-700' :
                    'text-red-700'}`}>
                  {formatDistance(store.distance)}
                </span>
                <span className={`text-xs
                  ${status?.color === 'green' ? 'text-green-600' :
                    status?.color === 'yellow' ? 'text-amber-600' :
                    'text-red-600'}`}>
                  {t('map.away' as any)}
                </span>
              </div>
            )}

            {/* Locate button — always visible, opens this store on map */}
            <button
              onClick={(e) => { e.stopPropagation(); onLocateMeClick() }}
              className="flex flex-col items-center px-3 py-2 rounded-xl border border-dashed border-slate-300 text-slate-400 hover:border-violet-400 hover:text-violet-500 transition-colors"
            >
              <Navigation className="w-4 h-4 mb-0.5" />
              <span className="text-xs">{t('map.mapBtn' as any)}</span>
            </button>
          </div>
        </div>

        {status && (
          <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-xl text-xs
            ${status.color === 'green' ? 'bg-green-50 text-green-700' :
              status.color === 'yellow' ? 'bg-amber-50 text-amber-700' :
              'bg-red-50 text-red-700'}`}>
            {status.color === 'green' && <CheckCircle className="w-3.5 h-3.5" />}
            {status.color === 'yellow' && <Clock className="w-3.5 h-3.5" />}
            {status.color === 'red' && <XCircle className="w-3.5 h-3.5" />}
            <span className="font-medium">{status.label}</span>
            <span className="opacity-75 ml-auto">{status.description}</span>
          </div>
        )}
      </div>

      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-400">{t('map.tapToView' as any)}</span>
        <ChevronRight className="w-4 h-4 text-slate-300" />
      </div>
    </div>
  )
}
