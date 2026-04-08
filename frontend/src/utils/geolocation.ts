export interface UserPosition {
  lat: number
  lng: number
  accuracy: number
  timestamp: number
}

export type GeolocationStatus =
  | 'idle'
  | 'requesting'
  | 'locating'
  | 'success'
  | 'denied'
  | 'unavailable'
  | 'timeout'

export interface GeolocationResult {
  status: GeolocationStatus
  position: UserPosition | null
  error: string | null
}

export function getCurrentPosition(options?: {
  timeout?: number
  maximumAge?: number
  enableHighAccuracy?: boolean
}): Promise<UserPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('UNAVAILABLE'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
      }),
      (err) => {
        if (err.code === 1) reject(new Error('DENIED'))
        else if (err.code === 2) reject(new Error('UNAVAILABLE'))
        else reject(new Error('TIMEOUT'))
      },
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 10000,
        maximumAge: options?.maximumAge ?? 30000,
      }
    )
  })
}

export function getDistanceMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000
  const p1 = (lat1 * Math.PI) / 180
  const p2 = (lat2 * Math.PI) / 180
  const dp = ((lat2 - lat1) * Math.PI) / 180
  const dl = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dp / 2) ** 2 +
            Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`
  return `${(meters / 1000).toFixed(1)}km`
}

export function getGeofenceStatus(distanceMeters: number, geofenceRadius: number, t?: (key: string) => string): {
  canCheckIn: boolean
  label: string
  color: 'green' | 'yellow' | 'red'
  description: string
} {
  const tr = (key: string, fallback: string, replacements?: Record<string, string>) => {
    let text = t ? t(key) : fallback;
    if (text === key) text = fallback; // key not found
    if (replacements) {
      for (const [k, v] of Object.entries(replacements)) {
        text = text.replace(`{${k}}`, v);
      }
    }
    return text;
  };

  if (distanceMeters <= geofenceRadius) return {
    canCheckIn: true,
    label: tr('geo.insideGeofence', 'Inside geofence'),
    color: 'green',
    description: tr('geo.insideDesc', `You are ${Math.round(distanceMeters)}m from the store — check-in allowed`, { d: String(Math.round(distanceMeters)) }),
  }
  if (distanceMeters <= 200) return {
    canCheckIn: false,
    label: tr('geo.almostThere', 'Almost there'),
    color: 'yellow',
    description: tr('geo.almostDesc', `${Math.round(distanceMeters - geofenceRadius)}m more to reach the geofence`, { d: String(Math.round(distanceMeters - geofenceRadius)) }),
  }
  return {
    canCheckIn: false,
    label: tr('geo.farAway', 'Far away'),
    color: 'red',
    description: tr('geo.farDesc', `${formatDistance(distanceMeters)} away from this store`, { d: formatDistance(distanceMeters) }),
  }
}
