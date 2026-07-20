import { useEffect } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { websiteService } from '@/services/websiteService';
import { applyBranding } from '@/lib/utils';
import ShareButtons from './ShareButtons';
import UserPreferences from './UserPreferences';
import WebsiteFooter from './layout/WebsiteFooter';
import WebsiteHeader from './layout/WebsiteHeader';
import { LEGAL_PAGE_SLUGS } from './layout/layoutUtils';

export default function WebsiteLayout() {
  const { subdomain } = useParams();
  const location = useLocation();
  const {
    data: website,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['website', subdomain],
    queryFn: () => websiteService.getWebsite(subdomain),
    enabled: Boolean(subdomain),
  });

  useEffect(() => {
    if (website?.branding) applyBranding(website.branding);
  }, [website?.branding]);

  useEffect(() => {
    if (website) {
      document.title = website.seoDefaults?.title || website.organization?.name || '';
    }
  }, [website]);

  if (isLoading) return <LoadingState />;
  if (error || !website) return <MissingWebsite />;

  const { organization, pages = [], branding, seoDefaults, theme = {} } = website;
  const navigationPages = pages.filter((page) => !LEGAL_PAGE_SLUGS.includes(page.slug));
  const legalPages = pages.filter((page) => LEGAL_PAGE_SLUGS.includes(page.slug));
  const primaryColor = branding?.primaryColor || '#2563eb';
  const headerSettings = {
    showBookingButton: theme.header?.showBookingButton ?? true,
    bookingButtonText: theme.header?.bookingButtonText || 'Programeaza',
    sticky: theme.header?.sticky ?? true,
  };
  const footerSettings = {
    showAbout: theme.footer?.showAbout ?? true,
    showQuickLinks: theme.footer?.showQuickLinks ?? true,
    showContact: theme.footer?.showContact ?? true,
    showHours: theme.footer?.showHours ?? true,
    showSocialLinks: theme.footer?.showSocialLinks ?? false,
    socialLinks: theme.footer?.socialLinks || {},
    copyrightText: theme.footer?.copyrightText || '',
  };

  return (
    <>
      <SeoMetadata seo={seoDefaults} organization={organization} branding={branding} />
      <div className="flex min-h-screen flex-col">
        <WebsiteHeader
          branding={branding}
          currentPath={location.pathname}
          organization={organization}
          pages={navigationPages}
          primaryColor={primaryColor}
          settings={headerSettings}
          showBookingCta={Boolean(organization?.slug) && headerSettings.showBookingButton}
          subdomain={subdomain}
        />
        <main className="flex-1">
          <Outlet context={{ website, subdomain }} />
        </main>
        <WebsiteFooter
          organization={organization}
          pages={navigationPages}
          legalPages={legalPages}
          primaryColor={primaryColor}
          secondaryColor={branding?.secondaryColor}
          seoDescription={seoDefaults?.description}
          settings={footerSettings}
          showBranding={website.showBranding}
          subdomain={subdomain}
        />
      </div>
      <ShareButtons primaryColor={primaryColor} />
      <UserPreferences primaryColor={primaryColor} />
    </>
  );
}

function SeoMetadata({ seo, organization, branding }) {
  const title = seo?.title || organization?.name;
  let structuredData = null;
  if (seo?.customSchema) {
    try {
      JSON.parse(seo.customSchema);
      structuredData = seo.customSchema.replace(/</g, '\\u003c');
    } catch {
      structuredData = null;
    }
  }

  return (
    <>
      <title>{title}</title>
      {seo?.description && <meta name="description" content={seo.description} />}
      {seo?.keywords && (
        <meta
          name="keywords"
          content={Array.isArray(seo.keywords) ? seo.keywords.join(', ') : seo.keywords}
        />
      )}
      {seo?.canonicalUrl && <link rel="canonical" href={seo.canonicalUrl} />}
      {(seo?.robotsIndex === false || seo?.robotsFollow === false) && (
        <meta
          name="robots"
          content={`${seo.robotsIndex === false ? 'noindex' : 'index'}, ${seo.robotsFollow === false ? 'nofollow' : 'follow'}`}
        />
      )}
      {seo?.ogImage && <meta property="og:image" content={seo.ogImage} />}
      <meta property="og:title" content={title} />
      {seo?.description && <meta property="og:description" content={seo.description} />}
      {branding?.faviconUrl && <link rel="icon" href={branding.faviconUrl} />}
      {structuredData && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: structuredData }} />
      )}
      {seo?.customHeadCode && <div dangerouslySetInnerHTML={{ __html: seo.customHeadCode }} />}
    </>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600" />
    </div>
  );
}

function MissingWebsite() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">Website negasit</h1>
        <p className="text-gray-600">Aceasta pagina nu exista sau nu este publicata.</p>
      </div>
    </div>
  );
}
