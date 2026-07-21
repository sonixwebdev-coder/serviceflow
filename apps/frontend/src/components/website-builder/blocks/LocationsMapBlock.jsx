import { cn } from '@/lib/utils';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

const LocationsMapBlock = ({ data, settings, isEditing = false, onClick, crmData = [] }) => {
  const {
    title = 'Locatiile noastre',
    subtitle = '',
    autoSync = false,
    locations = [],
    showMap = true,
    showHours = true,
    showContact = true,
  } = data || {};

  const {
    backgroundColor = '#f9fafb',
    textColor = '#1f2937',
    padding = { top: 60, bottom: 60 },
    maxWidth = 'xl',
  } = settings || {};

  // Use CRM data if autoSync is enabled, otherwise use manual locations
  const displayLocations = autoSync ? crmData : locations;

  const maxWidthClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-3xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full',
  };

  const formatHours = (hours) => {
    if (!hours) return null;
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayLabels = ['Luni', 'Marti', 'Miercuri', 'Joi', 'Vineri', 'Sambata', 'Duminica'];

    return days
      .map((day, index) => {
        const dayHours = hours[day];
        if (!dayHours) return null;
        if (dayHours.closed) {
          return { day: dayLabels[index], hours: 'Inchis' };
        }
        return { day: dayLabels[index], hours: `${dayHours.open} - ${dayHours.close}` };
      })
      .filter(Boolean);
  };

  return (
    <div
      className={cn(
        'w-full px-6',
        isEditing && 'cursor-pointer hover:ring-2 hover:ring-blue-500 hover:ring-offset-2'
      )}
      style={{
        backgroundColor,
        paddingTop: `${padding.top}px`,
        paddingBottom: `${padding.bottom}px`,
      }}
      onClick={onClick}
    >
      <div className={cn('mx-auto', maxWidthClasses[maxWidth])}>
        {/* Header */}
        {(title || subtitle) && (
          <div className="text-center mb-12">
            {title && (
              <h2 className="text-3xl font-bold mb-4" style={{ color: textColor }}>
                {title}
              </h2>
            )}
            {subtitle && <p className="text-lg text-gray-600 max-w-2xl mx-auto">{subtitle}</p>}
          </div>
        )}

        {/* Locations */}
        <div
          className={cn(
            'grid gap-6',
            displayLocations.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'
          )}
        >
          {displayLocations.length > 0 ? (
            displayLocations.map((location, index) => (
              <div key={location.id || index} className="bg-white rounded-lg border shadow-xs">
                <div className="p-6 border-b">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    {location.name}
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  {/* Address */}
                  {location.address && <p className="text-gray-600">{location.address}</p>}

                  {/* Contact */}
                  {showContact && (location.phone || location.email) && (
                    <div className="space-y-2">
                      {location.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <a href={`tel:${location.phone}`} className="hover:text-blue-600">
                            {location.phone}
                          </a>
                        </div>
                      )}
                      {location.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <a href={`mailto:${location.email}`} className="hover:text-blue-600">
                            {location.email}
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hours */}
                  {showHours && location.hours && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-medium mb-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        Program
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                        {formatHours(location.hours)?.map(({ day, hours }) => (
                          <div key={day} className="flex justify-between">
                            <span className="text-gray-500">{day}</span>
                            <span>{hours}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Map placeholder */}
                  {showMap && location.coordinates && (
                    <div className="h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="text-gray-500 text-sm">
                        Harta - {location.coordinates.lat}, {location.coordinates.lng}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-gray-500">
              {autoSync ? 'Nu exista locatii configurate' : 'Adaugati locatii din setari'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const locationsMapBlockDefaults = {
  title: 'Locatiile noastre',
  subtitle: 'Vizitati-ne la una dintre locatiile noastre',
  autoSync: false,
  locations: [],
  showMap: true,
  showHours: true,
  showContact: true,
};

export default LocationsMapBlock;
