import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { runtimeConfig } from '@/config/runtime';
import { cn } from '@/lib/utils';
import { condenseBusinessHours, footerGridClass, getWebsitePagePath } from './layoutUtils';

export default function WebsiteFooter({
  organization,
  pages,
  legalPages,
  primaryColor,
  secondaryColor,
  seoDescription,
  settings,
  showBranding,
  subdomain,
}) {
  const primaryLocation = organization?.primaryLocation;
  const organizationContact = organization?.profile;
  const hasBooking = Boolean(organization?.slug);
  const footerColumns = [
    settings.showAbout,
    settings.showQuickLinks,
    settings.showContact,
    settings.showHours,
  ].filter(Boolean).length;
  const hasSocialLinks =
    settings.showSocialLinks && Object.values(settings.socialLinks).some(Boolean);

  return (
    <footer className="text-white" style={{ backgroundColor: secondaryColor || '#111827' }}>
      <div className="h-1" style={{ backgroundColor: primaryColor }} />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {footerColumns > 0 && (
          <div className={cn('grid gap-6', footerGridClass(footerColumns))}>
            {settings.showAbout && (
              <div>
                <h3 className="mb-3 text-base font-semibold text-white">{organization?.name}</h3>
                {seoDescription && (
                  <p className="text-sm leading-relaxed text-gray-400">{seoDescription}</p>
                )}
              </div>
            )}
            {settings.showQuickLinks && (
              <QuickLinks hasBooking={hasBooking} pages={pages} subdomain={subdomain} />
            )}
            {settings.showContact && (
              <ContactDetails
                contact={organizationContact}
                location={primaryLocation}
                primaryColor={primaryColor}
              />
            )}
            {settings.showHours && (
              <BusinessHours
                operatingHours={primaryLocation?.operatingHours}
                primaryColor={primaryColor}
              />
            )}
          </div>
        )}

        {hasSocialLinks && (
          <SocialLinks
            links={settings.socialLinks}
            primaryColor={primaryColor}
            separated={footerColumns > 0}
          />
        )}

        <FooterCredits
          copyrightText={settings.copyrightText}
          hasContent={footerColumns > 0 || hasSocialLinks}
          legalPages={legalPages}
          organizationName={organization?.name}
          primaryColor={primaryColor}
          showBranding={showBranding}
          subdomain={subdomain}
        />
      </div>
    </footer>
  );
}

function QuickLinks({ hasBooking, pages, subdomain }) {
  return (
    <div>
      <h3 className="mb-3 text-base font-semibold text-white">Link-uri rapide</h3>
      <ul className={cn(pages.length > 4 ? 'grid grid-cols-2 gap-x-4 gap-y-2' : 'space-y-2')}>
        {pages.map((page) => (
          <li key={page.id}>
            <Link
              to={getWebsitePagePath(subdomain, page)}
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              {page.title}
            </Link>
          </li>
        ))}
        {hasBooking && (
          <li>
            <Link
              to={`/${subdomain}/booking`}
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Programare online
            </Link>
          </li>
        )}
      </ul>
    </div>
  );
}

function ContactDetails({ contact, location, primaryColor }) {
  const phone = contact?.phone || location?.phone;
  const email = contact?.email || location?.email;
  const address = [contact?.address || location?.address, location?.city, location?.county]
    .filter(Boolean)
    .join(', ');

  return (
    <div>
      <h3 className="mb-3 text-base font-semibold text-white">Contact</h3>
      <ul className="space-y-3">
        {phone && (
          <li className="flex items-center gap-3">
            <Phone className="h-5 w-5 flex-shrink-0" style={{ color: primaryColor }} />
            <a href={`tel:${phone}`} className="transition-colors hover:text-white">
              {phone}
            </a>
          </li>
        )}
        {email && (
          <li className="flex items-center gap-3">
            <Mail className="h-5 w-5 flex-shrink-0" style={{ color: primaryColor }} />
            <a href={`mailto:${email}`} className="transition-colors hover:text-white">
              {email}
            </a>
          </li>
        )}
        {address && (
          <li className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: primaryColor }} />
            <span>{address}</span>
          </li>
        )}
      </ul>
    </div>
  );
}

function BusinessHours({ operatingHours, primaryColor }) {
  return (
    <div>
      <h3 className="mb-3 text-base font-semibold text-white">Program</h3>
      {operatingHours ? (
        <ul className="space-y-1.5 text-sm">
          {condenseBusinessHours(operatingHours).map((group) => (
            <li key={`${group.startDay}-${group.endDay}`} className="flex justify-between gap-2">
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
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" style={{ color: primaryColor }} />
          <span>Contactati-ne pentru program</span>
        </div>
      )}
    </div>
  );
}

function SocialLinks({ links, primaryColor, separated }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-4',
        separated ? 'mt-6 border-t border-gray-800 pt-6' : ''
      )}
    >
      {Object.entries(links).map(([type, url]) => (
        <SocialIcon key={type} type={type} url={url} primaryColor={primaryColor} />
      ))}
    </div>
  );
}

function SocialIcon({ type, url, primaryColor }) {
  if (!url) return null;
  const paths = {
    facebook:
      'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
    instagram:
      'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z',
    tiktok:
      'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
    youtube:
      'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  };
  if (!paths[type]) return null;

  return (
    <a
      href={url}
      aria-label={type}
      target="_blank"
      rel="noopener noreferrer"
      className="text-gray-400 transition-colors hover:text-white"
      style={{ '--hover-color': primaryColor }}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
        <path d={paths[type]} />
      </svg>
    </a>
  );
}

function FooterCredits({
  copyrightText,
  hasContent,
  legalPages,
  organizationName,
  primaryColor,
  showBranding,
  subdomain,
}) {
  return (
    <div
      className={cn(
        'text-center text-sm text-gray-500',
        hasContent ? 'mt-6 border-t border-gray-800 pt-6' : ''
      )}
    >
      <p>
        {copyrightText || (
          <>
            &copy; {new Date().getFullYear()} {organizationName}. Toate drepturile rezervate.
          </>
        )}
      </p>
      {legalPages.length > 0 && (
        <div className="mt-2 flex items-center justify-center gap-3">
          {legalPages.map((page, index) => (
            <span key={page.id} className="inline-flex items-center gap-3">
              {index > 0 && <span className="text-gray-700">|</span>}
              <Link
                to={getWebsitePagePath(subdomain, page)}
                className="transition-colors hover:text-gray-300"
              >
                {page.title}
              </Link>
            </span>
          ))}
        </div>
      )}
      {showBranding && (
        <p className="mt-2">
          Creat cu{' '}
          <a
            href={runtimeConfig.platformUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-gray-300"
            style={{ color: primaryColor }}
          >
            {runtimeConfig.platformName}
          </a>
        </p>
      )}
    </div>
  );
}
