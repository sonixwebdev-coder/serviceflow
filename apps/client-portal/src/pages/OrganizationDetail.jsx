import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Phone, Clock, CalendarCheck, Briefcase, Navigation, CheckCircle } from 'lucide-react';
import { useMarketplaceOrganization } from '@/hooks/useMarketplace';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { getSectorConfig } from '@/utils/sectors';
import { formatCurrency } from '@/lib/utils';

const DAY_NAMES_RO = {
  monday: 'Luni', tuesday: 'Marti', wednesday: 'Miercuri',
  thursday: 'Joi', friday: 'Vineri', saturday: 'Sambata', sunday: 'Duminica',
};

export default function OrganizationDetail() {
  const { slug } = useParams();
  const { data, isLoading, isError } = useMarketplaceOrganization(slug);

  const org = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          <p className="text-sm text-gray-400">Se incarca...</p>
        </div>
      </div>
    );
  }

  if (isError || !org) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
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
      {/* ── Header banner ─────────────────────────────────────── */}
      <div className={`bg-gradient-to-r ${sector?.gradient || 'from-primary-500 to-primary-600'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Inapoi la marketplace
          </Link>

          <div className="flex items-start gap-5">
            {/* Sector icon */}
            <div className="hidden sm:flex h-16 w-16 rounded-2xl bg-white/20 backdrop-blur-sm items-center justify-center flex-shrink-0 border border-white/20">
              {SectorIcon && <SectorIcon className="h-8 w-8 text-white" />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">{org.name}</h1>
                {sector && (
                  <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-white/20 text-white backdrop-blur-sm border border-white/15">
                    {sector.label}
                  </span>
                )}
              </div>
              {org.description && (
                <p className="mt-2 text-white/80 max-w-2xl leading-relaxed">{org.description}</p>
              )}

              {/* Quick info pills */}
              <div className="mt-4 flex flex-wrap gap-4">
                {filledLocations.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-white/75">
                    <MapPin className="h-4 w-4" />
                    {filledLocations.length} {filledLocations.length === 1 ? 'locatie' : 'locatii'}
                  </span>
                )}
                {services.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-white/75">
                    <Briefcase className="h-4 w-4" />
                    {services.length} {services.length === 1 ? 'serviciu' : 'servicii'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* ── Main content ─────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-10">

            {/* Services */}
            {services.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-gray-400" />
                  Servicii oferite
                </h2>
                <div className="space-y-3">
                  {services.map((service, index) => (
                    <div
                      key={service.id || index}
                      className="flex items-start gap-4 p-5 bg-white rounded-xl border border-gray-200 hover:border-primary-200 hover:shadow-sm transition-all"
                    >
                      {/* Icon */}
                      <div className={`h-10 w-10 rounded-xl ${sector?.iconBg || 'bg-primary-100'} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <CheckCircle className={`h-5 w-5 ${sector?.iconColor || 'text-primary-600'}`} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900">{service.name}</h3>
                        {service.description && (
                          <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">{service.description}</p>
                        )}
                        {/* Badges row */}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {service.duration && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                              <Clock className="h-3 w-3" />
                              {service.duration} min
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Price */}
                      {service.price != null && (
                        <div className="flex-shrink-0 text-right">
                          <span className="text-lg font-bold text-gray-900">
                            {formatCurrency(service.price)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Locations */}
            {filledLocations.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
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
                            <h3 className="font-semibold text-gray-900">{loc.name}</h3>
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
                                      <span className="font-medium">{DAY_NAMES_RO[day] || day}:</span>{' '}
                                      {(hours.closed === true || hours.isOpen === false)
                                        ? 'Inchis'
                                        : `${hours.open || hours.openTime} - ${hours.close || hours.closeTime}`}
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

            {/* Empty state */}
            {services.length === 0 && filledLocations.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <div className="h-14 w-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="h-7 w-7 text-gray-300" />
                </div>
                <p className="text-gray-700 font-medium">
                  Aceasta companie nu a publicat inca servicii sau detalii de locatie.
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Poti totusi crea o programare direct.
                </p>
              </div>
            )}
          </div>

          {/* ── Sidebar ──────────────────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">

              {/* CTA Card */}
              <div className={`rounded-2xl p-6 bg-gradient-to-br ${sector?.gradient || 'from-primary-500 to-primary-600'} text-white shadow-lg`}>
                <CalendarCheck className="h-9 w-9 mb-3 opacity-90" />
                <h3 className="text-lg font-bold">Programeaza o vizita</h3>
                <p className="mt-1 text-sm text-white/75">
                  Alege data si ora care ti se potrivesc
                </p>
                <Link to={`/book/${org.slug}`} className="block mt-5">
                  <button className="w-full py-3 px-4 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-sm text-sm">
                    Programeaza acum
                  </button>
                </Link>
              </div>

              {/* Quick info card */}
              {(filledLocations.length > 0 || sector) && (
                <Card>
                  <CardContent className="space-y-4">
                    {sector && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Categorie</p>
                        <div className="flex items-center gap-2">
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
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Locatie</p>
                        <p className="text-sm text-gray-900 flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          {[filledLocations[0].city, filledLocations[0].county].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    )}
                    {filledLocations[0]?.phone && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Telefon</p>
                        <p className="text-sm text-gray-900 flex items-center gap-1.5">
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
