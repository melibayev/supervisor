import { create } from 'zustand';

interface LocationState {
  mockEnabled: boolean;
  mockLat: number;
  mockLng: number;
  toggleMock: () => void;
  setMockLocation: (lat: number, lng: number) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  mockEnabled: localStorage.getItem('mockLocationEnabled') === 'true',
  mockLat: Number(localStorage.getItem('mockLat') || '41.2997'),
  mockLng: Number(localStorage.getItem('mockLng') || '69.2403'),

  toggleMock: () => set((state) => {
    const next = !state.mockEnabled;
    localStorage.setItem('mockLocationEnabled', String(next));
    return { mockEnabled: next };
  }),

  setMockLocation: (lat, lng) => {
    localStorage.setItem('mockLat', String(lat));
    localStorage.setItem('mockLng', String(lng));
    set({ mockLat: lat, mockLng: lng });
  },
}));
