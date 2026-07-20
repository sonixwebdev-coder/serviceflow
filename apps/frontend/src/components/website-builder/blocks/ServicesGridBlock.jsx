import { cn } from '@/lib/utils';
import { Clock, Banknote } from 'lucide-react';
import { getFileUrl } from '@/utils/api';

const ServicesGridBlock = ({ data, settings, isEditing = false, onClick, crmData = [] }) => {
  const {
    title = 'Serviciile noastre',
    subtitle = '',
    autoSync = false,
    services = [],
    columns = 3,
    showPrices = true,
    showDuration = true,
    showBookButton = true,
  } = data || {};

  const {
    backgroundColor = '#f9fafb',
    textColor = '#1f2937',
    padding = { top: 60, bottom: 60 },
    maxWidth = 'xl',
  } = settings || {};

  // Use CRM data if autoSync is enabled, otherwise use manual services
  const displayServices = autoSync ? crmData : services;

  const maxWidthClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-3xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-full',
  };

  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
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

        {/* Services Grid */}
        <div className={cn('grid gap-6', columnClasses[columns] || columnClasses[3])}>
          {displayServices.length > 0 ? (
            displayServices.map((service, index) => (
              <div
                key={service.id || index}
                className="bg-white rounded-lg border shadow-sm overflow-hidden"
              >
                {service.image && (
                  <div className="h-48 overflow-hidden">
                    <img
                      src={getFileUrl(service.image)}
                      alt={service.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-2">{service.name}</h3>
                  {service.description && (
                    <p className="text-sm text-gray-500 mb-4">{service.description}</p>
                  )}
                </div>
                {(showPrices || showDuration) && (
                  <div className="px-6 pb-4 flex gap-4">
                    {showPrices && service.price && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Banknote className="h-4 w-4" />
                        <span>{service.price}</span>
                      </div>
                    )}
                    {showDuration && service.duration && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <Clock className="h-4 w-4" />
                        <span>{service.duration}</span>
                      </div>
                    )}
                  </div>
                )}
                {showBookButton && (
                  <div className="px-6 pb-6">
                    <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">
                      Programeaza
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-gray-500">
              {autoSync ? 'Nu exista servicii configurate in CRM' : 'Adaugati servicii din setari'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const servicesGridBlockDefaults = {
  title: 'Serviciile noastre',
  subtitle: 'Descoperiti gama noastra de servicii profesionale',
  autoSync: false,
  services: [],
  columns: 3,
  showPrices: true,
  showDuration: true,
  showBookButton: true,
};

export default ServicesGridBlock;
