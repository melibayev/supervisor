import type { Store } from '@/types'
import { getGeofenceStatus } from '@/utils/geolocation'

declare global {
  interface Window {
    ymaps: any
  }
}

export function createUserLocationPlacemark(ymaps: any, lat: number, lng: number) {
  const Layout = ymaps.templateLayoutFactory.createClass(
    `<div style="
      position: relative;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="
        position: absolute;
        width: 48px; height: 48px;
        border-radius: 50%;
        background: rgba(109, 40, 217, 0.15);
        animation: ulmPulse 2s ease-out infinite;
      "></div>
      <div style="
        position: absolute;
        width: 36px; height: 36px;
        border-radius: 50%;
        background: rgba(109, 40, 217, 0.2);
        animation: ulmPulse 2s ease-out infinite 0.5s;
      "></div>
      <div style="
        position: absolute;
        width: 28px; height: 28px;
        border-radius: 50%;
        border: 2px solid rgba(109, 40, 217, 0.4);
        background: rgba(109, 40, 217, 0.08);
      "></div>
      <div style="
        width: 14px; height: 14px;
        border-radius: 50%;
        background: #7C3AED;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(109,40,217,0.5);
        z-index: 10;
        position: relative;
      "></div>
    </div>
    <style>
      @keyframes ulmPulse {
        0%   { transform: scale(0.8); opacity: 1; }
        100% { transform: scale(1.8); opacity: 0; }
      }
    </style>`
  )

  return new ymaps.Placemark(
    [lat, lng],
    { balloonContent: 'You are here' },
    {
      iconLayout: 'default#imageWithContent',
      iconContentLayout: Layout,
      iconImageHref: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      iconImageSize: [48, 48],
      iconImageOffset: [-24, -24],
      zIndex: 1000,
    }
  )
}

export function createStorePlacemark(
  ymaps: any,
  store: { name: string; address: string; latitude: number; longitude: number; geofenceRadius: number },
  status: 'pending' | 'completed' | 'nearby' | 'current',
  onClick?: () => void
) {
  const colors = {
    pending:   { bg: '#7C3AED', border: '#5B21B6', text: '#fff' },
    completed: { bg: '#22C55E', border: '#16A34A', text: '#fff' },
    nearby:    { bg: '#F59E0B', border: '#D97706', text: '#fff' },
    current:   { bg: '#CC0000', border: '#991B1B', text: '#fff' },
  }
  const c = colors[status]
  const initial = store.name.charAt(0).toUpperCase()

  const Layout = ymaps.templateLayoutFactory.createClass(
    `<div style="
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
    ">
      <div style="
        width: 40px; height: 40px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        background: ${c.bg};
        border: 3px solid ${c.border};
        box-shadow: 0 4px 12px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          transform: rotate(45deg);
          color: ${c.text};
          font-size: 15px;
          font-weight: 700;
          font-family: Inter, sans-serif;
        ">${initial}</span>
      </div>
      <div style="
        width: 12px; height: 4px;
        background: rgba(0,0,0,0.15);
        border-radius: 50%;
        margin-top: 2px;
      "></div>
    </div>`
  )

  const placemark = new ymaps.Placemark(
    [store.latitude, store.longitude],
    {
      hintContent: store.name,
      balloonContent: `
        <div style="font-family: Inter, sans-serif; padding: 4px 0; min-width: 180px;">
          <p style="font-weight:700; font-size:14px; margin:0 0 4px;">${store.name}</p>
          <p style="color:#64748b; font-size:12px; margin:0 0 2px;">${store.address}</p>
          <p style="color:#64748b; font-size:12px; margin:0;">Geofence: ${store.geofenceRadius}m</p>
        </div>
      `,
    },
    {
      iconLayout: 'default#imageWithContent',
      iconContentLayout: Layout,
      iconImageHref: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      iconImageSize: [40, 50],
      iconImageOffset: [-20, -50],
    }
  )

  if (onClick) placemark.events.add('click', onClick)
  return placemark
}

export function createGeofenceCircle(
  ymaps: any,
  store: { latitude: number; longitude: number; geofenceRadius: number },
  userDistanceMeters: number
) {
  const status = getGeofenceStatus(userDistanceMeters, store.geofenceRadius)

  const strokeColor =
    status.color === 'green'  ? '#22C55E' :
    status.color === 'yellow' ? '#F59E0B' :
    '#EF4444'

  const fillColor =
    status.color === 'green'  ? 'rgba(34,197,94,0.08)'  :
    status.color === 'yellow' ? 'rgba(245,158,11,0.08)' :
    'rgba(239,68,68,0.08)'

  return new ymaps.Circle(
    [[store.latitude, store.longitude], store.geofenceRadius],
    {},
    {
      fillColor,
      strokeColor,
      strokeWidth: 2,
      strokeStyle: 'dash',
    }
  )
}
