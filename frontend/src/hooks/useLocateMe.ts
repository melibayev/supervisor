import { useState, useCallback, useRef } from 'react'
import { getCurrentPosition, UserPosition, GeolocationStatus } from '@/utils/geolocation'
import { useLocationStore } from '@/stores/locationStore'

export function useLocateMe() {
  const { mockEnabled, mockLat, mockLng } = useLocationStore()
  const [status, setStatus] = useState<GeolocationStatus>('idle')
  const [position, setPosition] = useState<UserPosition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)

  const locateOnce = useCallback(async () => {
    setStatus('requesting')
    setError(null)

    if (mockEnabled) {
      const pos: UserPosition = {
        lat: mockLat,
        lng: mockLng,
        accuracy: 5,
        timestamp: Date.now(),
      }
      setPosition(pos)
      setStatus('success')
      return
    }

    try {
      setStatus('locating')
      const pos = await getCurrentPosition()
      setPosition(pos)
      setStatus('success')
    } catch (err: any) {
      const code = err.message as string
      setStatus(
        code === 'DENIED' ? 'denied' :
        code === 'UNAVAILABLE' ? 'unavailable' :
        code === 'TIMEOUT' ? 'timeout' :
        'unavailable'
      )
      setError(
        code === 'DENIED'      ? 'Location access denied. Please enable GPS in your browser settings.' :
        code === 'UNAVAILABLE' ? 'GPS is not available on this device.' :
        code === 'TIMEOUT'     ? 'Location request timed out. Please try again.' :
        'Could not get your location.'
      )
    }
  }, [mockEnabled, mockLat, mockLng])

  const startTracking = useCallback(() => {
    if (mockEnabled) {
      setPosition({ lat: mockLat, lng: mockLng, accuracy: 5, timestamp: Date.now() })
      setStatus('success')
      return
    }

    if (!navigator.geolocation) return
    setStatus('requesting')
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        })
        setStatus('success')
        setError(null)
      },
      (err) => {
        setStatus(err.code === 1 ? 'denied' : 'unavailable')
        setError(err.code === 1
          ? 'Location access denied.'
          : 'GPS unavailable.')
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
  }, [mockEnabled, mockLat, mockLng])

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    stopTracking()
    setStatus('idle')
    setPosition(null)
    setError(null)
  }, [stopTracking])

  return {
    status,
    position,
    error,
    isLoading: status === 'requesting' || status === 'locating',
    isSuccess: status === 'success',
    locateOnce,
    startTracking,
    stopTracking,
    reset,
  }
}
