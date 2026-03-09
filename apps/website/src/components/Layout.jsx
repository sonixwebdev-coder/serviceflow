import { useEffect } from 'react';
import { Outlet, useParams, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Menu, X, Phone, Mail, MapPin, Clock, Calendar } from 'lucide-react';
import { useState } from 'react';
import { websiteService } from '@/services/websiteService';
import { cn, applyBranding } from '@/lib/utils';
import UserPreferences from './UserPreferences';
import ShareButtons from './ShareButtons';

const DAY_NAMES = {
  monday: 'Luni',
  tuesday: 'Marti',
  wednesday: 'Miercuri',
  thursday: 'Joi',
  friday: 'Vineri',
  saturday: 'Sambata',
  sunday: 'Duminica',
};

/**
 * Groups consecutive days with the same hours into ranges.
 * e.g. "Luni - Vineri: 09:00 - 17:00" instead of 5 separate lines.
 */
const condenseBusinessHours = (operatingHours) => {
  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const entries = dayOrder
    .filter((day) => operatingHours[day] && DAY_NAMES[day])
    .map((day) => {
      const hours = operatingHours[day];
      const isOpen = hours.isOpen !== false;
      const label = isOpen ? `${hours.open || '09:00'} - ${hours.close || '17:00'}` : 'Inchis';
      return { day, dayName: DAY_NAMES[day], label, isOpen };
    });

  const groups = [];
  for (const entry of entries) {
    const last = groups[groups.length - 1];
    if (last && last.label === entry.label) {
      last.endDay = entry.dayName;
    } else {
      groups.push({ startDay: entry.dayName, endDay: entry.dayName, label: entry.label, isOpen: entry.isOpen });
    }
  }
  return groups;
};

// Social media icons as inline SVGs
const SocialIcon = ({ type, url, primaryColor }) => {
  if (!url) return null;

  const icons = {
    facebook: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    instagram: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
    tiktok: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
    youtube: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-gray-400 hover:text-white transition-colors"
      style={{ '--hover-color': primaryColor }}
    >
      {icons[type]}
    </a>
  );
};

export default function WebsiteLayout() {
  const { subdomain } = useParams();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Fetch website configuration
  const { data: website, isLoading, error } = useQuery({
    queryKey: ['website', subdomain],
    queryFn: () => websiteService.getWebsite(subdomain),
    enabled: !!subdomain,
  });

  // Apply branding colors when website loads
  useEffect(() => {
    if (website?.branding) {
      applyBranding(website.branding);
    }
  }, [website?.branding]);

  // Set document title
  useEffect(() => {
    if (website) {
      const { seoDefaults, organization } = website;
      document.title = seoDefaults?.title || organization?.name || '';
    }
  }, [website]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error || !website) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Website negasit</h1>
          <p className="text-gray-600">Aceasta pagina nu exista sau nu este publicata.</p>
        </div>
      </div>
    );
  }

  const { organization, pages, branding, seoDefaults } = website;
  // Backend already filters pages with where: { isPublished: true }
  const allPages = pages || [];
  const LEGAL_SLUGS = ['termeni-si-conditii', 'politica-de-confidentialitate'];
  const navPages = allPages.filter((p) => !LEGAL_SLUGS.includes(p.slug));
  const legalPages = allPages.filter((p) => LEGAL_SLUGS.includes(p.slug));
  const primaryColor = branding?.primaryColor || '#2563eb';
  const primaryLocation = organization?.primaryLocation;
  const hasBooking = !!organization?.slug;

  // Theme settings with defaults
  const headerSettings = {
    showBookingButton: website.theme?.header?.showBookingButton ?? true,
    bookingButtonText: website.theme?.header?.bookingButtonText || 'Programeaza',
    sticky: website.theme?.header?.sticky ?? true,
  };

  const footerSettings = {
    showAbout: website.theme?.footer?.showAbout ?? true,
    showQuickLinks: website.theme?.footer?.showQuickLinks ?? true,
    showContact: website.theme?.footer?.showContact ?? true,
    showHours: website.theme?.footer?.showHours ?? true,
    showSocialLinks: website.theme?.footer?.showSocialLinks ?? false,
    socialLinks: website.theme?.footer?.socialLinks || {},
    copyrightText: website.theme?.footer?.copyrightText || '',
  };

  // Show booking CTA only when booking exists AND setting is enabled
  const showBookingCta = hasBooking && headerSettings.showBookingButton;

  // Count visible footer columns for dynamic grid
  const footerColumns = [
    footerSettings.showAbout,
    footerSettings.showQuickLinks,
    footerSettings.showContact,
    footerSettings.showHours,
  ].filter(Boolean).length;

  const gridColsClass = {
    0: '',
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }[footerColumns] || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4';

  // Check if any social links exist
  const hasSocialLinks = footerSettings.showSocialLinks && Object.values(footerSettings.socialLinks).some(Boolean);

  // Determine active page from current path
  const currentPath = location.pathname;
  const getPagePath = (page) => `/${subdomain}/${page.slug === 'home' ? '' : page.slug}`;
  const isActivePage = (page) => {
    const pagePath = getPagePath(page);
    if (page.slug === 'home') {
      return currentPath === `/${subdomain}` || currentPath === `/${subdomain}/`;
    }
    return currentPath === pagePath || currentPath.startsWith(pagePath + '/');
  };

  return (
    <>
      <title>{seoDefaults?.title || organization?.name}</title>
      {seoDefaults?.description && (
        <meta name="description" content={seoDefaults.description} />
      )}
      {seoDefaults?.keywords && (
        <meta name="keywords" content={seoDefaults.keywords} />
      )}
      {seoDefaults?.ogImage && (
        <meta property="og:image" content={seoDefaults.ogImage} />
      )}
      <meta property="og:title" content={seoDefaults?.title || organization?.name} />
      {seoDefaults?.description && (
        <meta property="og:description" content={seoDefaults.description} />
      )}
      {branding?.faviconUrl && (
        <link rel="icon" href={branding.faviconUrl} />
      )}

      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className={cn('bg-white shadow-sm z-50', headerSettings.sticky ? 'sticky top-0' : '')}>
          <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              {/* Logo */}
              <div className="flex items-center">
                <Link to={`/${subdomain}`} className="flex items-center gap-3">
                  {branding?.logoUrl ? (
                    <img
                      src={branding.logoUrl}
                      alt={organization?.name}
                      className="h-10 w-auto"
                    />
                  ) : (
                    <span
                      className="text-xl font-bold"
                      style={{ color: primaryColor }}
                    >
                      {organization?.name}
                    </span>
                  )}
                </Link>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex md:items-center md:space-x-1">
                {navPages.map((page) => (
                  <Link
                    key={page.id}
                    to={getPagePath(page)}
                    className={cn(
                      'px-3 py-2 font-medium transition-colors relative',
                      isActivePage(page)
                        ? 'text-gray-900'
                        : 'text-gray-600 hover:text-gray-900'
                    )}
                  >
                    {page.title}
                    {isActivePage(page) && (
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
                    className="ml-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all hover:opacity-90 hover:shadow-md"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Calendar className="h-4 w-4" />
                    {headerSettings.bookingButtonText}
                  </Link>
                )}
              </div>

              {/* Mobile menu button */}
              <div className="flex items-center md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                >
                  {mobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </button>
              </div>
            </div>

            {/* Mobile Navigation */}
            {mobileMenuOpen && (
              <div className="md:hidden border-t border-gray-200 py-4">
                <div className="space-y-2">
                  {navPages.map((page) => (
                    <Link
                      key={page.id}
                      to={getPagePath(page)}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'block px-4 py-2 rounded-lg transition-colors',
                        isActivePage(page)
                          ? 'font-medium'
                          : 'text-gray-700 hover:bg-gray-100'
                      )}
                      style={isActivePage(page) ? { backgroundColor: `${primaryColor}10`, color: primaryColor } : undefined}
                    >
                      {page.title}
                    </Link>
                  ))}
                  {showBookingCta && (
                    <Link
                      to={`/${subdomain}/booking`}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block mx-4 mt-2 text-center px-4 py-2.5 rounded-lg text-white font-medium"
                      style={{ backgroundColor: primaryColor }}
                    >
                      <Calendar className="h-4 w-4 inline mr-2" />
                      {headerSettings.bookingButtonText}
                    </Link>
                  )}
                </div>
              </div>
            )}
          </nav>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          <Outlet context={{ website, subdomain }} />
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 text-gray-300">
          <div className="h-1" style={{ backgroundColor: primaryColor }} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {footerColumns > 0 && (
              <div className={cn('grid gap-6', gridColsClass)}>
                {/* About */}
                {footerSettings.showAbout && (
                  <div>
                    <h3 className="text-white font-semibold text-base mb-3">
                      {organization?.name}
                    </h3>
                    {seoDefaults?.description && (
                      <p className="text-gray-400 text-sm leading-relaxed">
                        {seoDefaults.description}
                      </p>
                    )}
                  </div>
                )}

                {/* Quick Links */}
                {footerSettings.showQuickLinks && (
                  <div>
                    <h3 className="text-white font-semibold text-base mb-3">
                      Link-uri rapide
                    </h3>
                    <ul className={cn(
                      navPages.length > 4
                        ? 'grid grid-cols-2 gap-x-4 gap-y-2'
                        : 'space-y-2'
                    )}>
                      {navPages.map((page) => (
                        <li key={page.id}>
                          <Link
                            to={getPagePath(page)}
                            className="text-gray-400 hover:text-white transition-colors text-sm"
                          >
                            {page.title}
                          </Link>
                        </li>
                      ))}
                      {hasBooking && (
                        <li>
                          <Link
                            to={`/${subdomain}/booking`}
                            className="text-gray-400 hover:text-white transition-colors text-sm"
                          >
                            Programare online
                          </Link>
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Contact Info */}
                {footerSettings.showContact && (
                  <div>
                    <h3 className="text-white font-semibold text-base mb-3">
                      Contact
                    </h3>
                    <ul className="space-y-3">
                      {primaryLocation?.phone && (
                        <li className="flex items-center gap-3">
                          <Phone className="h-5 w-5 flex-shrink-0" style={{ color: primaryColor }} />
                          <a href={`tel:${primaryLocation.phone}`} className="hover:text-white transition-colors">
                            {primaryLocation.phone}
                          </a>
                        </li>
                      )}
                      {primaryLocation?.email && (
                        <li className="flex items-center gap-3">
                          <Mail className="h-5 w-5 flex-shrink-0" style={{ color: primaryColor }} />
                          <a href={`mailto:${primaryLocation.email}`} className="hover:text-white transition-colors">
                            {primaryLocation.email}
                          </a>
                        </li>
                      )}
                      {(primaryLocation?.address || primaryLocation?.city) && (
                        <li className="flex items-start gap-3">
                          <MapPin className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: primaryColor }} />
                          <span>
                            {[primaryLocation.address, primaryLocation.city, primaryLocation.county].filter(Boolean).join(', ')}
                          </span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Business Hours */}
                {footerSettings.showHours && (
                  <div>
                    <h3 className="text-white font-semibold text-base mb-3">
                      Program
                    </h3>
                    {primaryLocation?.operatingHours ? (
                      <ul className="space-y-1.5 text-sm">
                        {condenseBusinessHours(primaryLocation.operatingHours).map((group, i) => (
                          <li key={i} className="flex justify-between gap-2">
                            <span className="text-gray-400">
                              {group.startDay === group.endDay
                                ? group.startDay
                                : `${group.startDay} - ${group.endDay}`}
                            </span>
                            <span className={group.isOpen ? 'text-gray-300' : 'text-gray-500'}>
                              {group.label}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <Clock className="h-4 w-4" />
                        <span>Contactati-ne pentru program</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Social Links */}
            {hasSocialLinks && (
              <div className={cn('flex items-center justify-center gap-4', footerColumns > 0 ? 'border-t border-gray-800 mt-6 pt-6' : '')}>
                {footerSettings.socialLinks.facebook && (
                  <SocialIcon type="facebook" url={footerSettings.socialLinks.facebook} primaryColor={primaryColor} />
                )}
                {footerSettings.socialLinks.instagram && (
                  <SocialIcon type="instagram" url={footerSettings.socialLinks.instagram} primaryColor={primaryColor} />
                )}
                {footerSettings.socialLinks.tiktok && (
                  <SocialIcon type="tiktok" url={footerSettings.socialLinks.tiktok} primaryColor={primaryColor} />
                )}
                {footerSettings.socialLinks.youtube && (
                  <SocialIcon type="youtube" url={footerSettings.socialLinks.youtube} primaryColor={primaryColor} />
                )}
              </div>
            )}

            <div className={cn('text-center text-sm text-gray-500', (footerColumns > 0 || hasSocialLinks) ? 'border-t border-gray-800 mt-6 pt-6' : '')}>
              <p>
                {footerSettings.copyrightText || (
                  <>&copy; {new Date().getFullYear()} {organization?.name}. Toate drepturile rezervate.</>
                )}
              </p>
              {legalPages.length > 0 && (
                <div className="mt-2 flex items-center justify-center gap-3">
                  {legalPages.map((page, i) => (
                    <span key={page.id} className="inline-flex items-center gap-3">
                      {i > 0 && <span className="text-gray-700">|</span>}
                      <Link
                        to={getPagePath(page)}
                        className="hover:text-gray-300 transition-colors"
                      >
                        {page.title}
                      </Link>
                    </span>
                  ))}
                </div>
              )}
              {website.showBranding && (
                <p className="mt-2">
                  Creat cu{' '}
                  <a
                    href="https://forja.it.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-gray-300 transition-colors"
                    style={{ color: primaryColor }}
                  >
                    ForjaIt
                  </a>
                </p>
              )}
            </div>
          </div>
        </footer>
      </div>

      <ShareButtons primaryColor={primaryColor} />
      <UserPreferences primaryColor={primaryColor} />
    </>
  );
}
