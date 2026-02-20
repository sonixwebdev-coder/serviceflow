const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const {
  getWebsite,
  createWebsite,
  updateWebsite,
  deleteWebsite,
  isSubdomainAvailable,
  listPages,
  getPageById,
  createPage,
  updatePage,
  deletePage,
  reorderPages,
  listLeads,
  getLeadById,
  updateLead,
  deleteLead,
  convertLeadToClient,
  verifyDomain,
  getCrmDataForBlocks,
} = require('../services/websiteService');
const {
  createWebsiteSchema,
  updateWebsiteSchema,
  createPageSchema,
  updatePageSchema,
  listPagesQuerySchema,
  updateLeadSchema,
  listLeadsQuerySchema,
  verifyDomainSchema,
} = require('../schemas/websiteSchema');
const { logFromRequest } = require('../services/auditLogService');
const { ok, created } = require('../utils/http');
const { z } = require('zod');

const router = express.Router();

// ============== Website Routes ==============

/**
 * GET /api/website
 * Get the organization's website
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const website = await getWebsite(req.tenantPrisma, req.user.organizationId);
    return ok(res, website);
  })
);

/**
 * POST /api/website
 * Create a website for the organization (admin only)
 */
router.post(
  '/',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(createWebsiteSchema),
  asyncHandler(async (req, res) => {
    const website = await createWebsite(req.tenantPrisma, req.body, req.user.organizationId);

    await logFromRequest(req, {
      action: 'CREATE',
      entityType: 'Website',
      entityId: website.id,
      description: `Creat website cu subdomain-ul: ${website.subdomain}`,
      metadata: { subdomain: website.subdomain },
    });

    return created(res, website, 'Website-ul a fost creat cu succes');
  })
);

/**
 * GET /api/website/check-subdomain
 * Check if a subdomain is available
 */
router.get(
  '/check-subdomain',
  authenticate,
  validate(z.object({ subdomain: z.string().min(3).max(50) }), 'query'),
  asyncHandler(async (req, res) => {
    const available = await isSubdomainAvailable(req.tenantPrisma, req.query.subdomain);
    return ok(res, { available });
  })
);

/**
 * GET /api/website/crm-data/:dataType
 * Get CRM data for auto-sync blocks
 */
router.get(
  '/crm-data/:dataType',
  authenticate,
  asyncHandler(async (req, res) => {
    const { dataType } = req.params;
    const data = await getCrmDataForBlocks(req.tenantPrisma, req.user.organizationId, dataType);
    return ok(res, data);
  })
);

/**
 * PATCH /api/website/:websiteId
 * Update website settings (admin only)
 */
router.patch(
  '/:websiteId',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(updateWebsiteSchema),
  asyncHandler(async (req, res) => {
    const website = await updateWebsite(
      req.tenantPrisma,
      req.params.websiteId,
      req.body,
      req.user.organizationId
    );

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: 'Website',
      entityId: website.id,
      description: `Actualizat website: ${website.subdomain}`,
      metadata: { changes: Object.keys(req.body) },
    });

    return ok(res, website, 'Website-ul a fost actualizat cu succes');
  })
);

/**
 * DELETE /api/website/:websiteId
 * Delete website (admin only)
 */
router.delete(
  '/:websiteId',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const result = await deleteWebsite(req.tenantPrisma, req.params.websiteId, req.user.organizationId);

    await logFromRequest(req, {
      action: 'DELETE',
      entityType: 'Website',
      entityId: req.params.websiteId,
      description: 'Website-ul a fost sters',
    });

    return ok(res, result);
  })
);

/**
 * POST /api/website/:websiteId/publish
 * Publish/unpublish website (admin only)
 */
router.post(
  '/:websiteId/publish',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(z.object({ isPublished: z.boolean() })),
  asyncHandler(async (req, res) => {
    const website = await updateWebsite(
      req.tenantPrisma,
      req.params.websiteId,
      { isPublished: req.body.isPublished },
      req.user.organizationId
    );

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: 'Website',
      entityId: website.id,
      description: req.body.isPublished ? 'Website publicat' : 'Website retras din publicare',
    });

    return ok(res, website, req.body.isPublished ? 'Website-ul a fost publicat' : 'Website-ul a fost retras');
  })
);

/**
 * POST /api/website/:websiteId/verify-domain
 * Verify custom domain ownership (admin only)
 */
router.post(
  '/:websiteId/verify-domain',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(verifyDomainSchema),
  asyncHandler(async (req, res) => {
    const website = await verifyDomain(
      req.tenantPrisma,
      req.params.websiteId,
      req.body.domain,
      req.user.organizationId
    );

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: 'Website',
      entityId: website.id,
      description: `Domeniul ${req.body.domain} a fost verificat`,
    });

    return ok(res, website, 'Domeniul a fost verificat cu succes');
  })
);

// ============== Page Routes ==============

/**
 * GET /api/website/:websiteId/pages
 * List pages for a website
 */
router.get(
  '/:websiteId/pages',
  authenticate,
  validate(listPagesQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await listPages(req.tenantPrisma, req.params.websiteId, req.query);
    return ok(res, result);
  })
);

/**
 * POST /api/website/:websiteId/pages
 * Create a new page (admin/manager only)
 */
router.post(
  '/:websiteId/pages',
  authenticate,
  authorize({ roles: ['admin', 'manager'] }),
  validate(createPageSchema),
  asyncHandler(async (req, res) => {
    const page = await createPage(
      req.tenantPrisma,
      req.params.websiteId,
      req.body,
      req.user.organizationId
    );

    await logFromRequest(req, {
      action: 'CREATE',
      entityType: 'WebsitePage',
      entityId: page.id,
      description: `Creata pagina: ${page.title}`,
      metadata: { slug: page.slug, pageType: page.pageType },
    });

    return created(res, page, 'Pagina a fost creata cu succes');
  })
);

/**
 * POST /api/website/:websiteId/pages/reorder
 * Reorder pages (admin/manager only)
 */
router.post(
  '/:websiteId/pages/reorder',
  authenticate,
  authorize({ roles: ['admin', 'manager'] }),
  validate(z.object({ pageIds: z.array(z.string()).min(1) })),
  asyncHandler(async (req, res) => {
    const result = await reorderPages(
      req.tenantPrisma,
      req.params.websiteId,
      req.body.pageIds,
      req.user.organizationId
    );

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: 'Website',
      entityId: req.params.websiteId,
      description: 'Reordonat paginile website-ului',
    });

    return ok(res, result);
  })
);

/**
 * GET /api/website/:websiteId/pages/:pageId
 * Get page details
 */
router.get(
  '/:websiteId/pages/:pageId',
  authenticate,
  asyncHandler(async (req, res) => {
    const page = await getPageById(req.tenantPrisma, req.params.pageId);
    return ok(res, page);
  })
);

/**
 * PATCH /api/website/:websiteId/pages/:pageId
 * Update a page (admin/manager only)
 */
router.patch(
  '/:websiteId/pages/:pageId',
  authenticate,
  authorize({ roles: ['admin', 'manager'] }),
  validate(updatePageSchema),
  asyncHandler(async (req, res) => {
    const page = await updatePage(
      req.tenantPrisma,
      req.params.pageId,
      req.body,
      req.user.organizationId
    );

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: 'WebsitePage',
      entityId: page.id,
      description: `Actualizata pagina: ${page.title}`,
      metadata: { changes: Object.keys(req.body) },
    });

    return ok(res, page, 'Pagina a fost actualizata cu succes');
  })
);

/**
 * DELETE /api/website/:websiteId/pages/:pageId
 * Delete a page (admin only)
 */
router.delete(
  '/:websiteId/pages/:pageId',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const page = await getPageById(req.tenantPrisma, req.params.pageId);
    const result = await deletePage(req.tenantPrisma, req.params.pageId, req.user.organizationId);

    await logFromRequest(req, {
      action: 'DELETE',
      entityType: 'WebsitePage',
      entityId: req.params.pageId,
      description: `Stearsa pagina: ${page.title}`,
    });

    return ok(res, result);
  })
);

// ============== Lead Routes ==============

/**
 * GET /api/website/:websiteId/leads
 * List leads for a website
 */
router.get(
  '/:websiteId/leads',
  authenticate,
  validate(listLeadsQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await listLeads(req.tenantPrisma, req.params.websiteId, req.query);
    return ok(res, result);
  })
);

/**
 * GET /api/website/:websiteId/leads/:leadId
 * Get lead details
 */
router.get(
  '/:websiteId/leads/:leadId',
  authenticate,
  asyncHandler(async (req, res) => {
    const lead = await getLeadById(req.tenantPrisma, req.params.leadId);
    return ok(res, lead);
  })
);

/**
 * PATCH /api/website/:websiteId/leads/:leadId
 * Update a lead
 */
router.patch(
  '/:websiteId/leads/:leadId',
  authenticate,
  validate(updateLeadSchema),
  asyncHandler(async (req, res) => {
    const lead = await updateLead(
      req.tenantPrisma,
      req.params.leadId,
      req.body,
      req.user.organizationId
    );

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: 'WebsiteLead',
      entityId: lead.id,
      description: `Actualizat lead: ${lead.firstName} ${lead.lastName}`,
      metadata: { changes: Object.keys(req.body) },
    });

    return ok(res, lead, 'Lead-ul a fost actualizat');
  })
);

/**
 * DELETE /api/website/:websiteId/leads/:leadId
 * Delete a lead
 */
router.delete(
  '/:websiteId/leads/:leadId',
  authenticate,
  asyncHandler(async (req, res) => {
    const lead = await getLeadById(req.tenantPrisma, req.params.leadId);
    const result = await deleteLead(req.tenantPrisma, req.params.leadId, req.user.organizationId);

    await logFromRequest(req, {
      action: 'DELETE',
      entityType: 'WebsiteLead',
      entityId: req.params.leadId,
      description: `Sters lead: ${lead.firstName} ${lead.lastName}`,
    });

    return ok(res, result);
  })
);

/**
 * POST /api/website/:websiteId/leads/:leadId/convert
 * Convert lead to client
 */
router.post(
  '/:websiteId/leads/:leadId/convert',
  authenticate,
  asyncHandler(async (req, res) => {
    const { currentLocationId } = await req.getLocationContext();
    const result = await convertLeadToClient(
      req.tenantPrisma,
      req.params.leadId,
      req.user.organizationId,
      currentLocationId
    );

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: 'WebsiteLead',
      entityId: req.params.leadId,
      description: `Lead convertit in client: ${result.lead.firstName} ${result.lead.lastName}`,
      metadata: { clientId: result.client.id },
    });

    return ok(res, result, 'Lead-ul a fost convertit in client');
  })
);

module.exports = router;
