import { useQuery } from '@tanstack/react-query';
import { Clock, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { websiteService } from '@/services/websiteService';

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-pulse">
      <div className="h-40 bg-gray-200" />
      <div className="p-6 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-3/4" />
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
        </div>
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-10 bg-gray-200 rounded w-full mt-2" />
      </div>
    </div>
  );
}

export default function ServicesGridBlock({ data, subdomain, branding }) {
  const {
    title,
    subtitle,
    autoSync = true,
    services: staticServices = [],
    columns = 3,
    showPrices = true,
    showDuration = false,
    showBookButton = true,
  } = data;

  const primaryColor = branding?.primaryColor || '#2563eb';

  // Fetch services from CRM if autoSync is enabled
  const { data: crmServices, isLoading, isError } = useQuery({
    queryKey: ['crm-services', subdomain],
    queryFn: () => websiteService.getCrmData(subdomain, 'services'),
    enabled: autoSync,
  });

  const services = autoSync ? (crmServices || []) : staticServices;

  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div>
      {(title || subtitle) && (
        <div className="text-center mb-10">
          {title && <h2 className="text-3xl font-bold text-gray-900 mb-2">{title}</h2>}
          {subtitle && <p className="text-lg text-gray-600">{subtitle}</p>}
        </div>
      )}

      {autoSync && isLoading ? (
        <div className={cn('grid gap-6', gridCols[columns] || gridCols[3])}>
          {Array.from({ length: columns }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : autoSync && isError ? (
        <p className="text-center text-gray-500">Nu s-au putut incarca serviciile. Incercati mai tarziu.</p>
      ) : services.length === 0 ? (
        <p className="text-center text-gray-500">Nu exista servicii disponibile.</p>
      ) : (
        <div className={cn('grid gap-6', gridCols[columns] || gridCols[3])}>
          {services.map((service, index) => (
            <div
              key={service.id || index}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              {service.image && (
                <img
                  src={service.image}
                  alt={service.name}
                  className="w-full h-40 object-cover"
                />
              )}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {service.name}
                </h3>
                {service.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {service.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {showPrices && service.price && (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-xs font-medium"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <DollarSign className="h-3.5 w-3.5" />
                      {service.price} {service.currency || 'RON'}
                    </span>
                  )}
                  {showDuration && service.duration && (
                    <span className="flex items-center gap-1 text-gray-500">
                      <Clock className="h-4 w-4" />
                      {service.duration} min
                    </span>
                  )}
                </div>
                {showBookButton && (
                  <Link
                    to={`/${subdomain}/booking`}
                    className="mt-4 inline-block w-full text-center py-2.5 px-4 rounded-lg text-white font-medium transition-all hover:opacity-90 hover:shadow-md"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Programeaza
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
