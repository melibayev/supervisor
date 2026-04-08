import { useState } from 'react';
import { useLocationStore } from '@/stores/locationStore';
import { MapPin, X, TestTube2 } from 'lucide-react';

export default function DevLocationPanel() {
  const { mockEnabled, mockLat, mockLng, toggleMock, setMockLocation } = useLocationStore();
  const [open, setOpen] = useState(false);
  const [lat, setLat] = useState(String(mockLat));
  const [lng, setLng] = useState(String(mockLng));

  const applyCoords = () => {
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    if (!isNaN(la) && !isNaN(ln)) setMockLocation(la, ln);
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-4 right-4 z-[100] p-3 rounded-full shadow-lg transition-colors ${
          mockEnabled ? 'bg-orange-500 text-white' : 'bg-secondary-200 text-secondary-600'
        }`}
        title="Dev Location"
      >
        <TestTube2 className="h-5 w-5" />
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-16 right-4 z-[100] w-72 bg-white rounded-xl shadow-2xl border border-secondary-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <MapPin className="h-4 w-4 text-orange-500" />
              Test Location
            </div>
            <button onClick={() => setOpen(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={toggleMock}
              className={`relative w-10 h-5 rounded-full transition-colors ${mockEnabled ? 'bg-orange-500' : 'bg-secondary-300'}`}
            >
              <div className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${mockEnabled ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm">{mockEnabled ? 'Mock ON' : 'Mock OFF'}</span>
          </label>

          {mockEnabled && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lat}
                    onChange={e => setLat(e.target.value)}
                    onBlur={applyCoords}
                    className="w-full h-8 px-2 text-xs border rounded-md"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={lng}
                    onChange={e => setLng(e.target.value)}
                    onBlur={applyCoords}
                    className="w-full h-8 px-2 text-xs border rounded-md"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {[
                  { label: 'Tashkent Center', lat: 41.2997, lng: 69.2403 },
                  { label: 'Chorsu', lat: 41.3262, lng: 69.2345 },
                  { label: 'Samarkand', lat: 39.6547, lng: 66.9597 },
                ].map(p => (
                  <button
                    key={p.label}
                    onClick={() => {
                      setLat(String(p.lat));
                      setLng(String(p.lng));
                      setMockLocation(p.lat, p.lng);
                    }}
                    className="text-[10px] px-2 py-1 bg-secondary-100 rounded-md hover:bg-secondary-200 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <p className="text-[10px] text-muted-foreground">
                GPS will use these coordinates instead of real location
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
