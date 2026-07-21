import { useState, useEffect } from 'react';
import { Search, X, SlidersHorizontal, Building2, MapPin } from 'lucide-react';
import {
  useMarketplaceOrganizations,
  useMarketplaceFilters,
  useMarketplaceStats,
} from '@/hooks/useMarketplace';
import OrganizationCard from '@/components/marketplace/OrganizationCard';
import Button from '@/components/ui/Button';
import { SECTORS } from '@/utils/sectors';

export default function Marketplace({ basePath = '/marketplace' }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sector, setSector] = useState('');
  const [city, setCity] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSectorChange = (value) => {
    setSector(value === sector ? '' : value);
    setPage(1);
  };

  const handleCityChange = (value) => {
    setCity(value === city ? '' : value);
    setPage(1);
  };

  const filters = {
    search: debouncedSearch || undefined,
    sector: sector || undefined,
    city: city || undefined,
    page,
    limit: 12,
  };

  const { data, isLoading } = useMarketplaceOrganizations(filters);
  const { data: filtersData } = useMarketplaceFilters();
  const { data: statsData } = useMarketplaceStats();

  const orgs = data?.data?.items || [];
  const pagination = data?.data?.pagination || {};
  const availableFilters = filtersData?.data || { sectors: [], cities: [] };
  const stats = statsData?.data || {};

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSector('');
    setCity('');
    setPage(1);
  };

  const hasActiveFilters = debouncedSearch || sector || city;

  // Build sector data: merge API counts with static SECTORS config
  const sectorCards = Object.entries(SECTORS).map(([key, config]) => {
    const apiSector = availableFilters.sectors.find((s) => s.value === key);
    return {
      key,
      ...config,
      count: apiSector?.count ?? 0,
    };
  });

  const isPortal = basePath !== '/marketplace';

  return (
    <div className={isPortal ? 'space-y-6' : 'min-h-screen bg-gray-50'}>
      {/* Header */}
      {isPortal ? (
        <div className="page-header">
          <div>
            <h1 className="page-title">Descopera</h1>
            <p className="page-subtitle">Gaseste serviciul potrivit si programeaza online</p>
          </div>
          <div className="mt-4 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cauta dupa nume, serviciu sau oras..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-sm hover:bg-gray-100"
                >
                  <X className="h-3.5 w-3.5 text-gray-400" />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-linear-to-br from-primary-600 to-primary-700 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
            <div className="max-w-2xl">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Gaseste serviciul potrivit
              </h1>
              <p className="mt-3 text-primary-100 text-lg">
                Cauta printre companiile verificate si programeaza online, in cateva secunde.
              </p>
            </div>

            {/* Search bar */}
            <div className="mt-8 max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cauta dupa nume, serviciu sau oras..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-white/30 shadow-lg"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-gray-100"
                  >
                    <X className="h-4 w-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick stats */}
            {stats.organizationCount > 0 && (
              <div className="mt-6 flex items-center gap-6 text-sm text-primary-200">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  {stats.organizationCount}{' '}
                  {stats.organizationCount === 1 ? 'companie' : 'companii'}
                </span>
                {stats.cityCount > 0 && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    in {stats.cityCount} {stats.cityCount === 1 ? 'oras' : 'orase'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className={isPortal ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}>
        {/* Browse by Category - always visible */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">Categorii</h2>
            {sector && (
              <button
                onClick={() => {
                  setSector('');
                  setPage(1);
                }}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                Vezi toate
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {sectorCards.map((s) => {
              const Icon = s.icon;
              const isActive = sector === s.key;
              const hasOrgs = s.count > 0;

              let cardClass =
                'relative text-left p-5 rounded-2xl border-2 transition-all duration-200 ';
              if (isActive) {
                cardClass += `${s.lightBg} ${s.borderColor} shadow-md`;
              } else if (hasOrgs) {
                cardClass +=
                  'bg-white border-gray-200 hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300';
              } else {
                cardClass += 'bg-gray-50 border-gray-100 opacity-60';
              }

              return (
                <button key={s.key} onClick={() => handleSectorChange(s.key)} className={cardClass}>
                  <div className="flex items-start gap-4">
                    <div
                      className={`h-12 w-12 rounded-xl ${s.iconBg} flex items-center justify-center shrink-0`}
                    >
                      <Icon className={`h-6 w-6 ${s.iconColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 text-sm">{s.label}</h3>
                        {isActive && <span className={`h-2 w-2 rounded-full ${s.iconBg}`} />}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{s.description}</p>
                      <p
                        className={`text-xs font-medium mt-2 ${hasOrgs ? s.iconColor : 'text-gray-400'}`}
                      >
                        {hasOrgs
                          ? `${s.count} ${s.count === 1 ? 'companie' : 'companii'}`
                          : 'In curand'}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Browse by City */}
        {availableFilters.cities.length > 0 && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="h-5 w-5 text-gray-400" />
              Orase
            </h2>
            <div className="flex flex-wrap gap-2">
              {availableFilters.cities.map((c) => {
                const cityName = typeof c === 'object' ? c.name : c;
                const cityCount = typeof c === 'object' ? c.count : null;
                const isActive = city === cityName;

                return (
                  <button
                    key={cityName}
                    onClick={() => handleCityChange(cityName)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      isActive
                        ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    {cityName}
                    {cityCount != null && (
                      <span className={`text-xs ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                        ({cityCount})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Active filters bar */}
        {hasActiveFilters && (
          <div className="mb-6 p-3 bg-white rounded-xl border border-gray-200 flex flex-wrap items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-gray-400 ml-1" />
            <span className="text-sm text-gray-500 mr-1">Filtre active:</span>

            {sector && (
              <button
                onClick={() => {
                  setSector('');
                  setPage(1);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 hover:bg-primary-200 transition-colors"
              >
                {SECTORS[sector]?.label || sector}
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {city && (
              <button
                onClick={() => {
                  setCity('');
                  setPage(1);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 hover:bg-primary-200 transition-colors"
              >
                <MapPin className="h-3 w-3" />
                {city}
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {debouncedSearch && (
              <button
                onClick={() => {
                  setSearch('');
                  setDebouncedSearch('');
                  setPage(1);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 hover:bg-primary-200 transition-colors"
              >
                "{debouncedSearch}"
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              onClick={clearFilters}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors ml-auto"
            >
              Sterge tot
            </button>
          </div>
        )}

        {/* Results section */}
        <section>
          {/* Results header */}
          {!isLoading && (
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {hasActiveFilters ? 'Rezultate' : 'Toate companiile'}
              </h2>
              {orgs.length > 0 && (
                <p className="text-sm text-gray-500">
                  {pagination.total} {pagination.total === 1 ? 'rezultat' : 'rezultate'}
                  {hasActiveFilters ? ' gasite' : ''}
                </p>
              )}
            </div>
          )}

          {/* Results */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
                <p className="text-sm text-gray-400">Se cauta...</p>
              </div>
            </div>
          ) : orgs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {hasActiveFilters ? 'Nu am gasit rezultate' : 'Nicio companie disponibila'}
              </h3>
              <p className="mt-2 text-gray-500 max-w-sm mx-auto">
                {hasActiveFilters
                  ? 'Incearca sa modifici termenul de cautare sau sa stergi filtrele aplicate.'
                  : 'Momentan nu exista companii inregistrate. Revino in curand!'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                >
                  Sterge toate filtrele
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {orgs.map((org) => (
                  <OrganizationCard key={org.id} org={org} basePath={basePath} />
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterioara
                  </Button>
                  <span className="text-sm text-gray-500">
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Urmatoarea
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
