import { useState, useEffect, useCallback } from 'react';
import { useLocationStore } from '@/stores/locationStore';

interface GeoState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation() {
  const { mockEnabled, mockLat, mockLng } = useLocationStore();
  const [state, setState] = useState<GeoState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false
  });

  const getCurrentPosition = useCallback((): Promise<{ latitude: number; longitude: number }> => {
    if (mockEnabled) {
      const result = { latitude: mockLat, longitude: mockLng };
      setState({ ...result, accuracy: 5, error: null, loading: false });
      return Promise.resolve(result);
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const error = 'Geolocation is not supported';
        setState(prev => ({ ...prev, error, loading: false }));
        reject(new Error(error));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setState({ latitude, longitude, accuracy, error: null, loading: false });
          resolve({ latitude, longitude });
        },
        (err) => {
          const error = err.message || 'Failed to get location';
          setState(prev => ({ ...prev, error, loading: false }));
          reject(new Error(error));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }, [mockEnabled, mockLat, mockLng]);

  return { ...state, getCurrentPosition };
}

export function useWatchPosition() {
  const { mockEnabled, mockLat, mockLng } = useLocationStore();
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (mockEnabled) {
      setPosition({ latitude: mockLat, longitude: mockLng });
      return;
    }

    if (!navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => setPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [mockEnabled, mockLat, mockLng]);

  return position;
}
