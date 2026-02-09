const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const asyncHandler = require('../../middleware/asyncHandler');
const validate = require('../../middleware/validate');
const {
  getWebsiteBySubdomain,
  getWebsiteByCustomDomain,
  getPublicPage,
  createLead,
  createReview,
  getCrmDataForBlocks,
  generateSitemapData,
} = require('../../services/websiteService');
const { createLeadSchema, createReviewSchema } = require('../../schemas/websiteSchema');
const { ok, created } = require('../../utils/http');
const prisma = require('../../../lib/prisma');

// Rate limiter for lead submissions: max 5 per IP per 15 minutes
const leadSubmissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Prea multe incercari. Va rugam asteptati 15 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}_${req.params.subdomain}`,
});

/**
 * GET /api/portal/website/:subdomain
 * Get website config by subdomain
 */
router.get(
  '/:subdomain',
  asyncHandler(async (req, res) => {
    const { subdomain } = req.params;
    const website = await getWebsiteBySubdomain(prisma, subdomain);
    return ok(res, website);
  })
);

/**
 * GET /api/portal/website/domain/:domain
 * Get website config by custom domain
 */
router.get(
  '/domain/:domain',
  asyncHandler(async (req, res) => {
    const { domain } = req.params;
    const website = await getWebsiteByCustomDomain(prisma, domain);
    return ok(res, website);
  })
);

/**
 * GET /api/portal/website/:subdomain/page/:slug
 * Get public page content
 */
router.get(
  '/:subdomain/page/:slug',
  asyncHandler(async (req, res) => {
    const { subdomain, slug } = req.params;

    // First get the website
    const website = await getWebsiteBySubdomain(prisma, subdomain);

    // Then get the page
    const page = await getPublicPage(prisma, website.id, slug);

    return ok(res, page);
  })
);

/**
 * GET /api/portal/website/:subdomain/crm/:dataType
 * Get CRM data for a website (services, team, locations)
 */
router.get(
  '/:subdomain/crm/:dataType',
  asyncHandler(async (req, res) => {
    const { subdomain, dataType } = req.params;

    // First get the website
    const website = await getWebsiteBySubdomain(prisma, subdomain);

    // Get CRM data
    const data = await getCrmDataForBlocks(prisma, website.organization.id, dataType);

    return ok(res, data);
  })
);

/**
 * POST /api/portal/website/:subdomain/lead
 * Submit a contact form / create a lead
 */
router.post(
  '/:subdomain/lead',
  leadSubmissionLimiter,
  validate(createLeadSchema),
  asyncHandler(async (req, res) => {
    const { subdomain } = req.params;

    // First get the website
    const website = await getWebsiteBySubdomain(prisma, subdomain);

    // Create the lead
    const lead = await createLead(prisma, website.id, {
      ...req.body,
      source: req.body.source || 'contact-form',
    });

    res.status(201).json({
      success: true,
      message: 'Multumim pentru mesaj! Veti fi contactat in curand.',
      data: { id: lead.id },
    });
  })
);

// Rate limiter for review submissions: max 3 per IP per hour
const reviewSubmissionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, message: 'Prea multe recenzii. Va rugam asteptati o ora.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `review_${req.ip}_${req.params.subdomain}`,
});

/**
 * POST /api/portal/website/:subdomain/review
 * Submit a review/testimonial
 */
router.post(
  '/:subdomain/review',
  reviewSubmissionLimiter,
  validate(createReviewSchema),
  asyncHandler(async (req, res) => {
    const { subdomain } = req.params;

    const website = await getWebsiteBySubdomain(prisma, subdomain);

    const review = await createReview(prisma, website.id, req.body);

    res.status(201).json({
      success: true,
      message: 'Multumim! Recenzia va fi publicata dupa aprobare.',
      data: { id: review.id },
    });
  })
);

/**
 * GET /api/portal/website/:subdomain/sitemap.xml
 * Generate sitemap for SEO
 */
router.get(
  '/:subdomain/sitemap.xml',
  asyncHandler(async (req, res) => {
    const { subdomain } = req.params;

    // First get the website
    const website = await getWebsiteBySubdomain(prisma, subdomain);

    // Generate sitemap data
    const { urls, baseUrl } = await generateSitemapData(prisma, website.id);

    // Build XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${url.lastmod}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  })
);

/**
 * GET /api/portal/website/:subdomain/robots.txt
 * Generate robots.txt for SEO
 */
router.get(
  '/:subdomain/robots.txt',
  asyncHandler(async (req, res) => {
    const { subdomain } = req.params;

    // First get the website to verify it exists and is published
    const website = await getWebsiteBySubdomain(prisma, subdomain);

    const baseUrl = website.customDomain && website.domainVerified
      ? `https://${website.customDomain}`
      : `https://${website.subdomain}.serviceflow.ro`;

    const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;

    res.set('Content-Type', 'text/plain');
    res.send(robotsTxt);
  })
);

/**
 * GET /api/portal/website/:subdomain/manifest.json
 * Generate web app manifest
 */
router.get(
  '/:subdomain/manifest.json',
  asyncHandler(async (req, res) => {
    const { subdomain } = req.params;

    const website = await getWebsiteBySubdomain(prisma, subdomain);
    const branding = website.branding || {};
    const seo = website.seoDefaults || {};

    const manifest = {
      name: seo.title || website.organization.name,
      short_name: website.organization.name,
      description: seo.description || `Website pentru ${website.organization.name}`,
      start_url: '/',
      display: 'standalone',
      background_color: branding.primaryColor || '#ffffff',
      theme_color: branding.primaryColor || '#3b82f6',
      icons: [
        ...(branding.faviconUrl
          ? [
              {
                src: branding.faviconUrl,
                sizes: '192x192',
                type: 'image/png',
              },
              {
                src: branding.faviconUrl,
                sizes: '512x512',
                type: 'image/png',
              },
            ]
          : []),
      ],
    };

    res.json(manifest);
  })
);

module.exports = router;
