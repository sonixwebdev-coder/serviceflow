import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, Briefcase, CalendarCheck } from 'lucide-react';
import { getSectorConfig } from '@/utils/sectors';

export default function OrganizationCard({ org, basePath = '/marketplace' }) {
  const sector = getSectorConfig(org.activitySector);
  const SectorIcon = sector?.icon;

  return (
    <Link to={`${basePath}/${org.slug}`} className="group block h-full">
      <div className="relative h-full bg-white rounded-2xl border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-gray-300 hover:-translate-y-0.5">
        {/* Colored top accent bar */}
        <div
          className={`h-1.5 bg-gradient-to-r ${sector?.gradient || 'from-primary-500 to-primary-600'}`}
        />

        <div className="p-5">
          {/* Sector icon + badge row */}
          <div className="flex items-start justify-between mb-4">
            <div
              className={`h-11 w-11 rounded-xl ${sector?.iconBg || 'bg-primary-100'} flex items-center justify-center`}
            >
              {SectorIcon && <SectorIcon className={`h-5 w-5 ${sector.iconColor}`} />}
            </div>
            {sector && (
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${sector.bgClass}`}
              >
                {sector.label}
              </span>
            )}
          </div>

          {/* Name */}
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
            {org.name}
          </h3>

          {/* Description */}
          {org.description && (
            <p className="mt-2 text-sm text-gray-500 line-clamp-2">{org.description}</p>
          )}

          {/* Info row */}
          <div className="mt-3 flex flex-col gap-2">
            {org.city && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                {org.city}
              </div>
            )}
            {org.serviceCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Briefcase className="h-3.5 w-3.5 flex-shrink-0" />
                {org.serviceCount} {org.serviceCount === 1 ? 'serviciu' : 'servicii'}
              </div>
            )}
          </div>

          {/* Action row */}
          <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 group-hover:text-primary-700 transition-colors">
              <CalendarCheck className="h-4 w-4" />
              Programeaza
            </span>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-primary-600 transition-all group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </Link>
  );
}
