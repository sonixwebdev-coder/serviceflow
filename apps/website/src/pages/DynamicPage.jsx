import { useEffect, useMemo } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { websiteService } from '@/services/websiteService';
import BlockRenderer from '@/components/blocks/BlockRenderer';

function generateJsonLd(website, page, content) {
  const schemas = [];
  const org = website?.organization;
  const loc = org?.primaryLocation;

  // LocalBusiness schema on home page
  if (page?.pageType === 'HOME' || page?.slug === 'home') {
    const business = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: org?.name,
      ...(website?.seoDefaults?.description && { description: website.seoDefaults.description }),
      ...(website?.branding?.logoUrl && { image: website.branding.logoUrl }),
      ...(loc?.address && {
        address: {
          '@type': 'PostalAddress',
          streetAddress: loc.address,
          ...(loc.city && { addressLocality: loc.city }),
          ...(loc.county && { addressRegion: loc.county }),
          addressCountry: 'RO',
        },
      }),
      ...(loc?.phone && { telephone: loc.phone }),
      ...(loc?.email && { email: loc.email }),
    };
    schemas.push(business);
  }

  // FAQPage schema for pages with FAQ blocks
  const faqBlocks = content?.filter((b) => b.type === 'faq' && b.data?.items?.length > 0) || [];
  if (faqBlocks.length > 0) {
    const allItems = faqBlocks.flatMap((b) => b.data.items);
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: allItems.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    });
  }

  // AggregateRating for testimonials blocks with ratings
  const testimonialBlocks = content?.filter((b) => b.type === 'testimonials' && b.data?.testimonials?.length > 0) || [];
  if (testimonialBlocks.length > 0) {
    const allTestimonials = testimonialBlocks.flatMap((b) => b.data.testimonials);
    const rated = allTestimonials.filter((t) => t.rating);
    if (rated.length > 0) {
      const avgRating = (rated.reduce((sum, t) => sum + t.rating, 0) / rated.length).toFixed(1);
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: org?.name,
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: avgRating,
          reviewCount: rated.length,
          bestRating: '5',
          worstRating: '1',
        },
        review: rated.slice(0, 10).map((t) => ({
          '@type': 'Review',
          reviewRating: {
            '@type': 'Rating',
            ratingValue: t.rating,
          },
          author: {
            '@type': 'Person',
            name: t.name || t.author || 'Anonim',
          },
          ...(t.content && { reviewBody: t.content }),
        })),
      });
    }
  }

  return schemas;
}

export default function DynamicPage() {
  const { subdomain, slug = 'home' } = useParams();
  const { website } = useOutletContext();

  // Fetch page content
  const { data: page, isLoading, error } = useQuery({
    queryKey: ['page', subdomain, slug],
    queryFn: () => websiteService.getPage(subdomain, slug || 'home'),
    enabled: !!subdomain,
  });

  const jsonLdSchemas = useMemo(
    () => generateJsonLd(website, page, page?.content),
    [website, page]
  );

  // Set page-specific document title
  const pageTitle = page?.seo?.title || page?.title;
  useEffect(() => {
    if (pageTitle && website?.organization?.name) {
      document.title = `${pageTitle} | ${website.organization.name}`;
    }
  }, [pageTitle, website?.organization?.name]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pagina negasita</h1>
          <p className="text-gray-600">Aceasta pagina nu exista.</p>
        </div>
      </div>
    );
  }

  const { content, seo } = page;
  const pageDescription = seo?.description || website?.seoDefaults?.description;

  return (
    <>
      {pageDescription && <meta name="description" content={pageDescription} />}
      {seo?.keywords && <meta name="keywords" content={Array.isArray(seo.keywords) ? seo.keywords.join(', ') : seo.keywords} />}
      {seo?.ogImage && <meta property="og:image" content={seo.ogImage} />}
      <meta property="og:title" content={pageTitle} />
      {pageDescription && <meta property="og:description" content={pageDescription} />}

      {/* JSON-LD Structured Data */}
      {jsonLdSchemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
        />
      ))}

      <div className="page-content">
        {content?.map((block) => (
          <BlockRenderer
            key={block.id}
            block={block}
            subdomain={subdomain}
            branding={website?.branding}
          />
        ))}

        {(!content || content.length === 0) && (
          <div className="min-h-[50vh] flex items-center justify-center">
            <p className="text-gray-500">Aceasta pagina nu are continut inca.</p>
          </div>
        )}
      </div>
    </>
  );
}
