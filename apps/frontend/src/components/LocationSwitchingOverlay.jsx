import { MapPin, Loader2 } from 'lucide-react';
import useLocationStore from '../state/useLocationStore';

/**
 * Full-screen overlay shown while location data is being loaded after switching.
 * Provides visual feedback that data is refreshing for the new location.
 */
const LocationSwitchingOverlay = () => {
  const { isSwitching, getCurrentLocation } = useLocationStore();
  const currentLocation = getCurrentLocation();

  if (!isSwitching) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4 rounded-xl bg-white p-8 shadow-xl border border-gray-100">
        <div className="relative">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
            <MapPin size={32} className="text-orange-600" />
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow">
            <Loader2 size={16} className="animate-spin text-orange-600" />
          </div>
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900">
            Se schimba locatia
          </h3>
          {currentLocation && (
            <p className="mt-1 text-sm text-gray-600">
              Se incarca datele pentru <span className="font-medium">{currentLocation.name}</span>
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-orange-400" style={{ animationDelay: '0ms' }} />
          <div className="h-2 w-2 animate-bounce rounded-full bg-orange-400" style={{ animationDelay: '150ms' }} />
          <div className="h-2 w-2 animate-bounce rounded-full bg-orange-400" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};

export default LocationSwitchingOverlay;
