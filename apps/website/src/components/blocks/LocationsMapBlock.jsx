import { useQuery } from '@tanstack/react-query';
import { MapPin, Phone, Mail, Clock, Navigation, ExternalLink } from 'lucide-react';
import { websiteService } from '@/services/websiteService';

const DAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DAY_NAMES = {
  monday: 'Luni',
  tuesday: 'Marti',
  wednesday: 'Miercuri',
  thursday: 'Joi',
  friday: 'Vineri',
  saturday: 'Sambata',
  sunday: 'Duminica',
};

function getMapEmbedUrl(location) {
  const query = [location.address, location.city, location.county].filter(Boolean).join(', ');
  if (!query) return null;
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}

function getDirectionsUrl(location) {
  const query = [location.address, location.city, location.county].filter(Boolean).join(', ');
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}

export default function LocationsMapBlock({ data, subdomain, branding }) {
  const {
    title,
    subtitle,
    autoSync = true,
    locations: staticLocations = [],
    showHours = true,
    showContact = true,
    showMap = true,
  } = data;

  const primaryColor = branding?.primaryColor || '#2563eb';

  const { data: crmLocations, isLoading } = useQuery({
    queryKey: ['crm-locations', subdomain],
    queryFn: () => websiteService.getCrmData(subdomain, 'locations'),
    enabled: autoSync,
  });

  const locations = autoSync ? crmLocations || [] : staticLocations;

  return (
    <div>
      {(title || subtitle) && (
        <div className="text-center mb-10">
          {title && <h2 className="text-3xl font-bold text-gray-900 mb-2">{title}</h2>}
          {subtitle && <p className="text-lg text-gray-600">{subtitle}</p>}
        </div>
      )}

      {isLoading && autoSync ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-5 w-32 bg-gray-200 rounded-sm mb-3" />
              <div className="h-4 w-48 bg-gray-200 rounded-sm mb-2" />
              <div className="h-4 w-36 bg-gray-200 rounded-sm" />
            </div>
          ))}
        </div>
      ) : locations.length === 0 ? (
        <p className="text-center text-gray-500">Nu exista locatii disponibile.</p>
      ) : (
        <div className="space-y-8">
          {/* Map + Cards Layout */}
          {showMap && locations.length > 0 && (
            <div className="rounded-xl overflow-hidden shadow-xs border border-gray-200">
              <iframe
                src={getMapEmbedUrl(locations[0])}
                className="w-full h-[300px] md:h-[400px]"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Map"
              />
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {locations.map((location, index) => (
              <div
                key={location.id || index}
                className="bg-white rounded-xl shadow-xs border border-gray-200 p-6"
              >
                <div className="flex items-start gap-3 mb-4">
                  <MapPin className="h-6 w-6 shrink-0 mt-0.5" style={{ color: primaryColor }} />
                  <div>
                    <h3 className="font-semibold text-gray-900">{location.name}</h3>
                    {location.address && (
                      <p className="text-gray-600 text-sm mt-1">
                        {location.address}
                        {location.city && `, ${location.city}`}
                        {location.county && `, ${location.county}`}
                      </p>
                    )}
                  </div>
                </div>

                {showContact && (
                  <div className="space-y-2 mb-4">
                    {location.phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <a
                          href={`tel:${location.phone}`}
                          className="text-sm hover:underline"
                          style={{ color: primaryColor }}
                        >
                          {location.phone}
                        </a>
                      </div>
                    )}
                    {location.email && (
                      <div className="flex items-center gap-3">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <a
                          href={`mailto:${location.email}`}
                          className="text-sm hover:underline"
                          style={{ color: primaryColor }}
                        >
                          {location.email}
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {showHours && location.operatingHours && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">Program</span>
                    </div>
                    <div className="ml-6 space-y-1">
                      {DAY_ORDER.filter((day) => location.operatingHours[day]).map((day) => {
                        const hours = location.operatingHours[day];
                        return (
                          <div key={day} className="flex justify-between text-sm">
                            <span className="text-gray-500">{DAY_NAMES[day] || day}</span>
                            <span className="text-gray-700">
                              {hours.closed ? 'Inchis' : `${hours.open} - ${hours.close}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Get Directions button */}
                {(location.address || location.city) && (
                  <a
                    href={getDirectionsUrl(location)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border-2 transition-all hover:shadow-md"
                    style={{ borderColor: primaryColor, color: primaryColor }}
                  >
                    <Navigation className="h-4 w-4" />
                    Indicatii
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
