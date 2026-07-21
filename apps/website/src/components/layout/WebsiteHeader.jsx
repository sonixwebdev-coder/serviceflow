import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Menu, X } from 'lucide-react';
import { cn, resolveFileUrl } from '@/lib/utils';
import { getWebsitePagePath, isWebsitePageActive } from './layoutUtils';

export default function WebsiteHeader({
  branding,
  currentPath,
  organization,
  pages,
  primaryColor,
  settings,
  showBookingCta,
  subdomain,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isActive = (page) => isWebsitePageActive(currentPath, subdomain, page);

  return (
    <header className={cn('z-50 bg-white shadow-xs', settings.sticky ? 'sticky top-0' : '')}>
      <nav aria-label="Navigatie principala" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex items-center">
            <Link to={`/${subdomain}`} className="flex items-center gap-3">
              {branding?.logoUrl ? (
                <img
                  src={resolveFileUrl(branding.logoUrl)}
                  alt={organization?.name}
                  className="h-10 w-auto"
                />
              ) : (
                <span className="text-xl font-bold" style={{ color: primaryColor }}>
                  {organization?.name}
                </span>
              )}
            </Link>
          </div>

          <div className="hidden md:flex md:items-center md:space-x-1">
            {pages.map((page) => (
              <Link
                key={page.id}
                to={getWebsitePagePath(subdomain, page)}
                className={cn(
                  'relative px-3 py-2 font-medium transition-colors',
                  isActive(page) ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {page.title}
                {isActive(page) && (
                  <span
                    className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                )}
              </Link>
            ))}
            {showBookingCta && (
              <Link
                to={`/${subdomain}/booking`}
                className="ml-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-white transition-all hover:opacity-90 hover:shadow-md"
                style={{ backgroundColor: primaryColor }}
              >
                <Calendar className="h-4 w-4" />
                {settings.bookingButtonText}
              </Link>
            )}
          </div>

          <div className="flex items-center md:hidden">
            <button
              type="button"
              aria-label={mobileMenuOpen ? 'Inchide meniul' : 'Deschide meniul'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-gray-200 py-4 md:hidden">
            <div className="space-y-2">
              {pages.map((page) => (
                <Link
                  key={page.id}
                  to={getWebsitePagePath(subdomain, page)}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'block rounded-lg px-4 py-2 transition-colors',
                    isActive(page) ? 'font-medium' : 'text-gray-700 hover:bg-gray-100'
                  )}
                  style={
                    isActive(page)
                      ? { backgroundColor: `${primaryColor}10`, color: primaryColor }
                      : undefined
                  }
                >
                  {page.title}
                </Link>
              ))}
              {showBookingCta && (
                <Link
                  to={`/${subdomain}/booking`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="mx-4 mt-2 block rounded-lg px-4 py-2.5 text-center font-medium text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Calendar className="mr-2 inline h-4 w-4" />
                  {settings.bookingButtonText}
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
