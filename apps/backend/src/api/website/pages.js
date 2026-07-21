const express = require('express');
const asyncHandler = require('../../middleware/asyncHandler');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validate = require('../../middleware/validate');
const {
  listPages,
  getPageById,
  createPage,
  bulkUpsertPages,
  updatePage,
  deletePage,
  reorderPages,
} = require('../../services/websiteService');
const {
  createPageSchema,
  updatePageSchema,
  listPagesQuerySchema,
} = require('../../schemas/websiteSchema');
const { logFromRequest } = require('../../services/auditLogService');
const { ok, created } = require('../../utils/http');
const { z } = require('zod');

const router = express.Router();

router.get(
  '/',
  authenticate,
  validate(listPagesQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await listPages(req.tenantPrisma, req.params.websiteId, req.query);
    return ok(res, result);
  })
);

router.post(
  '/',
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

router.post(
  '/bulk',
  authenticate,
  authorize({ roles: ['admin', 'manager'] }),
  validate(z.object({ pages: z.array(createPageSchema).min(1) })),
  asyncHandler(async (req, res) => {
    const pages = await bulkUpsertPages(
      req.tenantPrisma,
      req.params.websiteId,
      req.body.pages,
      req.user.organizationId
    );

    await logFromRequest(req, {
      action: 'CREATE',
      entityType: 'WebsitePage',
      description: `Bulk upsert: ${pages.length} pagini`,
      metadata: { count: pages.length },
    });

    return ok(res, pages, `${pages.length} pagini create/actualizate`);
  })
);

router.post(
  '/reorder',
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

router.get(
  '/:pageId',
  authenticate,
  asyncHandler(async (req, res) => {
    const page = await getPageById(req.tenantPrisma, req.params.pageId, req.user.organizationId);
    return ok(res, page);
  })
);

router.patch(
  '/:pageId',
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

router.delete(
  '/:pageId',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const page = await getPageById(req.tenantPrisma, req.params.pageId, req.user.organizationId);
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

module.exports = router;
