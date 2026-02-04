import { MapPin, Building2 } from 'lucide-react';
import useLocationStore from '../state/useLocationStore';
import { useAuth } from '../context/useAuth';

/**
 * Shows the current location context in page headers.
 * Helps users understand which location's data they're viewing.
 */
const LocationContext = ({ className = '' }) => {
  const { getCurrentLocation, hasMultipleLocations } = useLocationStore();
  const { hasRole } = useAuth();
  const currentLocation = getCurrentLocation();

  // Don't show if org has only one location
  const showContext = hasMultipleLocations() || hasRole('admin', 'manager');

  if (!showContext || !currentLocation) {
    return null;
  }

  return (
    <div className={`inline-flex items-center gap-2 rounded-lg bg-orange-50 border border-orange-200 px-3 py-1.5 ${className}`}>
      <MapPin size={14} className="text-orange-600" />
      <span className="text-sm font-medium text-orange-700">
        {currentLocation.name}
      </span>
    </div>
  );
};

/**
 * Smaller inline version for use within other components
 */
export const LocationContextInline = ({ className = '' }) => {
  const { getCurrentLocation, hasMultipleLocations } = useLocationStore();
  const currentLocation = getCurrentLocation();

  if (!hasMultipleLocations() || !currentLocation) {
    return null;
  }

  return (
    <span className={`inline-flex items-center gap-1 text-xs text-gray-500 ${className}`}>
      <MapPin size={12} />
      {currentLocation.name}
    </span>
  );
};

export default LocationContext;
