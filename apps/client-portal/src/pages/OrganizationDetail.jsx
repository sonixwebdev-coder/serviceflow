import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Clock, CalendarCheck, Briefcase, Navigation } from 'lucide-react';
import { useMarketplaceOrganization } from '@/hooks/useMarketplace';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { getSectorConfig } from '@/utils/sectors';
import { formatCurrency } from '@/lib/utils';

export default function OrganizationDetail() {
  const { slug } = useParams();
  const { data, isLoading, isError } = useMarketplaceOrganization(slug);

  const org = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          <p className="text-sm text-gray-400">Se incarca...</p>
        </div>
      </div>
    );
  }

  if (isError || !org) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <Navigation className="h-8 w-8 text-gray-300" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Organizatia nu a fost gasita</h2>
        <p className="mt-2 text-gray-500">Aceasta organizatie nu exista sau nu este disponibila.</p>
        <Link
          to="/marketplace"
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Inapoi la marketplace
        </Link>
      </div>
    );
  }

  const sector = getSectorConfig(org.activitySector);
  const SectorIcon = sector?.icon;
  const services = org.services || [];
  const locations = org.locations || [];
  const filledLocations = locations.filter((l) => l.address || l.city || l.phone);

  return (
    <div>
      {/* Header banner */}
      <div className={`bg-gradient-to-r ${sector?.gradient || 'from-primary-500 to-primary-600'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Back link */}
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Marketplace
          </Link>

          <div className="flex items-start gap-4">
            {/* Sector icon */}
            <div className="hidden sm:flex h-14 w-14 rounded-xl bg-white/20 backdrop-blur-sm items-center justify-center flex-shrink-0">
              {SectorIcon && <SectorIcon className="h-7 w-7 text-white" />}
            </div>

            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">{org.name}</h1>
                {sector && (
                  <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-white/20 text-white backdrop-blur-sm">
                    {sector.label}
                  </span>
                )}
              </div>
              {org.description && (
                <p className="mt-2 text-white/80 max-w-2xl">{org.description}</p>
              )}

              {/* Quick info pills */}
              <div className="mt-4 flex flex-wrap gap-3">
                {filledLocations.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-white/70">
                    <MapPin className="h-4 w-4" />
                    {filledLocations.length} {filledLocations.length === 1 ? 'locatie' : 'locatii'}
                  </span>
                )}
                {services.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-white/70">
                    <Briefcase className="h-4 w-4" />
                    {services.length} {services.length === 1 ? 'serviciu' : 'servicii'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content — left column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Services */}
            {services.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-gray-400" />
                  Servicii oferite
                </h2>
                <div className="space-y-3">
                  {services.map((service, index) => (
                    <div
                      key={service.id || index}
                      className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-gray-900">{service.name}</h3>
                        {service.description && (
                          <p className="mt-0.5 text-sm text-gray-500 line-clamp-1">{service.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                        {service.duration && (
                          <span className="text-sm text-gray-400">
                            {service.duration} min
                          </span>
                        )}
                        {service.price != null && (
                          <span className="text-sm font-semibold text-gray-900">
                            {formatCurrency(service.price)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Locations */}
            {filledLocations.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  Locatii
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filledLocations.map((loc) => (
                    <Card key={loc.id}>
                      <CardContent>
                        <div className="flex items-start gap-3">
                          <div className={`h-10 w-10 rounded-lg ${sector?.iconBg || 'bg-primary-100'} flex items-center justify-center flex-shrink-0`}>
                            <MapPin className={`h-5 w-5 ${sector?.iconColor || 'text-primary-600'}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-gray-900">{loc.name}</h3>
                            {(loc.address || loc.city) && (
                              <p className="mt-1 text-sm text-gray-500">
                                {[loc.address, loc.city, loc.county].filter(Boolean).join(', ')}
                              </p>
                            )}
                            {loc.phone && (
                              <p className="mt-1.5 text-sm text-gray-500 flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5" />
                                {loc.phone}
                              </p>
                            )}
                            {loc.operatingHours && Object.keys(loc.operatingHours).length > 0 && (
                              <div className="mt-2 flex items-start gap-1.5 text-sm text-gray-500">
                                <Clock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                <div className="space-y-0.5">
                                  {Object.entries(loc.operatingHours).map(([day, hours]) => (
                                    <div key={day}>
                                      <span className="font-medium capitalize">{day}:</span> {hours}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state — when no services AND no filled locations */}
            {services.length === 0 && filledLocations.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-2xl">
                <Briefcase className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  Aceasta companie nu a publicat inca servicii sau detalii de locatie.
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Poti totusi crea o programare direct.
                </p>
              </div>
            )}
          </div>

          {/* Sidebar — right column */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* CTA Card */}
              <Card>
                <CardContent className="text-center py-6">
                  <CalendarCheck className={`h-10 w-10 mx-auto mb-3 ${sector?.iconColor || 'text-primary-600'}`} />
                  <h3 className="font-semibold text-gray-900">Programeaza o vizita</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Alege data si ora care ti se potrivesc
                  </p>
                  <Link to={`/book/${org.slug}`} className="block mt-4">
                    <Button className="w-full" size="lg">
                      Programeaza acum
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Quick info card */}
              {(filledLocations.length > 0 || sector) && (
                <Card>
                  <CardContent className="space-y-4">
                    {sector && (
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Categorie</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          {SectorIcon && (
                            <div className={`h-8 w-8 rounded-lg ${sector.iconBg} flex items-center justify-center`}>
                              <SectorIcon className={`h-4 w-4 ${sector.iconColor}`} />
                            </div>
                          )}
                          <span className="text-sm font-medium text-gray-900">{sector.label}</span>
                        </div>
                      </div>
                    )}
                    {filledLocations[0]?.city && (
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Locatie</p>
                        <p className="mt-1 text-sm text-gray-900 flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          {[filledLocations[0].city, filledLocations[0].county].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    )}
                    {filledLocations[0]?.phone && (
                      <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Telefon</p>
                        <p className="mt-1 text-sm text-gray-900 flex items-center gap-1.5">
                          <Phone className="h-4 w-4 text-gray-400" />
                          {filledLocations[0].phone}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
