import { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Check } from 'lucide-react';
import useLocationStore from '../state/useLocationStore';
import { useMyLocations, useAllOrgLocations } from '../hooks/useLocations';
import { useAuth } from '../context/useAuth';

const LocationSwitcher = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { hasRole } = useAuth();

  const {
    locations: userLocations,
    currentLocationId,
    setCurrentLocation,
    getCurrentLocation,
    initLocation,
  } = useLocationStore();
  const { loading: loadingUserLocations } = useMyLocations();

  // Check if user can switch between locations (admin/manager)
  const canSwitchLocations = hasRole('admin', 'manager');

  // Fetch all org locations for admins/managers
  const { locations: allOrgLocations, loading: loadingOrgLocations } = useAllOrgLocations({
    enabled: canSwitchLocations,
  });

  // Use all org locations for admins, user locations for others
  const availableLocations =
    canSwitchLocations && allOrgLocations.length > 0 ? allOrgLocations : userLocations;
  const currentLocation =
    getCurrentLocation() || availableLocations.find((l) => l.id === currentLocationId);

  const loading = loadingUserLocations || (canSwitchLocations && loadingOrgLocations);

  // Auto-initialize currentLocationId when locations load but none is selected.
  // Uses initLocation (not setCurrentLocation) so queries refetch with X-Location-Id
  // without triggering the full-screen switching overlay.
  useEffect(() => {
    if (!loading && !currentLocationId && availableLocations.length > 0) {
      const primary =
        availableLocations.find((l) => l.isPrimary || l.isPrimaryForUser) || availableLocations[0];
      initLocation(primary.id);
    }
  }, [loading, currentLocationId, availableLocations, initLocation]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500">
        <MapPin size={16} className="animate-pulse" />
        <span>Se incarca...</span>
      </div>
    );
  }

  // For non-admins with single location or no switching capability: show location name only (no dropdown)
  if (!canSwitchLocations || availableLocations.length <= 1) {
    return currentLocation ? (
      <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600">
        <MapPin size={16} className="text-primary" />
        <span className="max-w-[150px] truncate font-medium">{currentLocation.name}</span>
      </div>
    ) : null;
  }

  // For admins/managers with multiple locations: show dropdown
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-xs transition hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-primary focus:ring-offset-1"
      >
        <MapPin size={16} className="text-primary" />
        <span className="max-w-[150px] truncate">
          {currentLocation?.name || 'Selecteaza locatia'}
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-64 origin-top-right rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Locatii
          </div>
          <div className="max-h-64 overflow-y-auto">
            {availableLocations.map((location) => (
              <button
                key={location.id}
                type="button"
                onClick={() => {
                  setCurrentLocation(location.id);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between px-3 py-2 text-sm transition hover:bg-gray-50 ${
                  currentLocationId === location.id ? 'bg-orange-50 text-primary' : 'text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin
                    size={14}
                    className={currentLocationId === location.id ? 'text-primary' : 'text-gray-400'}
                  />
                  <div className="text-left">
                    <div className="font-medium">{location.name}</div>
                    {location.city && <div className="text-xs text-gray-500">{location.city}</div>}
                  </div>
                </div>
                {currentLocationId === location.id && <Check size={16} className="text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationSwitcher;
