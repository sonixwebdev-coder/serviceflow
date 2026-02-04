import { MapPin } from 'lucide-react';
import useLocationStore from '../state/useLocationStore';

/**
 * Badge component that shows which location a record belongs to.
 * Only visible when:
 * - The record has a locationId that differs from current location
 * - OR when showAlways is true
 * - OR when the record has no locationId (legacy data)
 */
const LocationBadge = ({
  locationId,
  locationName,
  showAlways = false,
  size = 'sm',
  className = '',
}) => {
  const { currentLocationId, locations } = useLocationStore();

  // Find location name if not provided
  const location = locationName
    ? { name: locationName }
    : locations.find((l) => l.id === locationId);

  // Determine if we should show the badge
  const isCurrentLocation = locationId === currentLocationId;
  const isLegacyData = !locationId;

  // Don't show if it's the current location and showAlways is false
  if (isCurrentLocation && !showAlways) {
    return null;
  }

  // Size variants
  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0.5 gap-0.5',
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
  };

  const iconSizes = {
    xs: 10,
    sm: 12,
    md: 14,
  };

  // Color variants
  const colorClasses = isLegacyData
    ? 'bg-gray-100 text-gray-600 border-gray-200'
    : isCurrentLocation
      ? 'bg-orange-50 text-orange-700 border-orange-200'
      : 'bg-blue-50 text-blue-700 border-blue-200';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClasses[size]} ${colorClasses} ${className}`}
      title={isLegacyData ? 'Fara locatie atribuita' : location?.name || 'Locatie necunoscuta'}
    >
      <MapPin size={iconSizes[size]} />
      <span className="truncate max-w-[100px]">
        {isLegacyData ? 'Fara locatie' : location?.name || 'Necunoscut'}
      </span>
    </span>
  );
};

export default LocationBadge;
