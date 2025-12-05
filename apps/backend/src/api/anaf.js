const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const validateRequest = require('../middleware/validateRequest');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const prisma = require('../../lib/prisma');
const { AppError } = require('../utils/errors');
const { ok, created } = require('../utils/http');

// ANAF Services
const {
  getAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  validateToken,
  getValidToken,
  encrypt,
} = require('../services/anaf/anafOAuthService');

const {
  healthCheck,
  downloadMessage: downloadMessageFromAnaf,
} = require('../services/anaf/anafApiService');

const {
  generateInvoiceXml,
  submitInvoiceToAnaf,
  syncInvoiceStatus,
  retryFailedInvoice,
  downloadAnafMessages,
  getInvoiceSyncStatus,
  syncPendingInvoices,
  getAnafConfig,
} = require('../services/anaf/anafInvoiceService');

// Validation schemas
const {
  createAnafConfigSchema,
  updateAnafConfigSchema,
  createCompanySchema,
  updateCompanySchema,
  oauthCallbackSchema,
  submitInvoiceSchema,
  listMessagesSchema,
  syncStatusQuerySchema,
  batchSyncSchema,
  validateXmlSchema,
} = require('../schemas/anafSchema');

const router = express.Router();

// ========================================
// Company Management Routes
// ========================================

// Create company
router.post(
  '/companies',
  authenticate,
  authorize({ roles: ['admin'] }),
  validateRequest(createCompanySchema, 'body'),
  asyncHandler(async (req, res) => {
    const company = await prisma.company.create({
      data: req.validated,
    });
    return created(res, company, 'Company created successfully');
  })
);

// List companies
router.get(
  '/companies',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const companies = await prisma.company.findMany({
      where: { isActive: true },
      include: {
        anafConfig: {
          select: {
            id: true,
            cif: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return ok(res, companies);
  })
);

// Get company by ID
router.get(
  '/companies/:id',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
      include: {
        anafConfig: true,
      },
    });

    if (!company) {
      throw new AppError('Company not found', 404);
    }

    return ok(res, company);
  })
);

// Update company
router.put(
  '/companies/:id',
  authenticate,
  authorize({ roles: ['admin'] }),
  validateRequest(updateCompanySchema, 'body'),
  asyncHandler(async (req, res) => {
    const company = await prisma.company.update({
      where: { id: req.params.id },
      data: req.validated,
    });
    return ok(res, company, 'Company updated successfully');
  })
);

// ========================================
// ANAF Configuration Routes
// ========================================

// Create ANAF configuration
router.post(
  '/config',
  authenticate,
  authorize({ roles: ['admin'] }),
  validateRequest(createAnafConfigSchema, 'body'),
  asyncHandler(async (req, res) => {
    const data = req.validated;

    // Encrypt client secret
    data.clientSecret = encrypt(data.clientSecret);

    // If no companyId provided, get or create default company
    if (!data.companyId) {
      let company = await prisma.company.findFirst({
        where: { isActive: true },
      });

      if (!company) {
        throw new AppError('No active company found. Please create a company first.', 400);
      }

      data.companyId = company.id;
    }

    const config = await prisma.anafConfig.create({
      data,
      include: {
        company: true,
      },
    });

    return created(res, config, 'ANAF configuration created successfully');
  })
);

// Get ANAF configuration
router.get(
  '/config',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const configs = await prisma.anafConfig.findMany({
      where: { isActive: true },
      include: {
        company: true,
        tokens: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            expiresAt: true,
            refreshExpiresAt: true,
            tokenType: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    // Add token validation status
    const configsWithStatus = configs.map(config => {
      const token = config.tokens[0];
      const validation = validateToken(token);

      return {
        ...config,
        tokenStatus: validation,
      };
    });

    return ok(res, configsWithStatus);
  })
);

// Get ANAF configuration by ID
router.get(
  '/config/:id',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const config = await prisma.anafConfig.findUnique({
      where: { id: req.params.id },
      include: {
        company: true,
        tokens: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!config) {
      throw new AppError('ANAF configuration not found', 404);
    }

    const token = config.tokens[0];
    const validation = validateToken(token);

    return ok(res, {
      ...config,
      tokenStatus: validation,
    });
  })
);

// Update ANAF configuration
router.put(
  '/config/:id',
  authenticate,
  authorize({ roles: ['admin'] }),
  validateRequest(updateAnafConfigSchema, 'body'),
  asyncHandler(async (req, res) => {
    const data = req.validated;

    // Encrypt client secret if provided
    if (data.clientSecret) {
      data.clientSecret = encrypt(data.clientSecret);
    }

    const config = await prisma.anafConfig.update({
      where: { id: req.params.id },
      data,
      include: {
        company: true,
      },
    });

    return ok(res, config, 'ANAF configuration updated successfully');
  })
);

// Delete ANAF configuration
router.delete(
  '/config/:id',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    await prisma.anafConfig.delete({
      where: { id: req.params.id },
    });
    return ok(res, { success: true }, 'ANAF configuration deleted successfully');
  })
);

// ========================================
// OAuth2 Authentication Routes
// ========================================

// Get authorization URL
router.get(
  '/auth/url',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const configId = req.query.configId;

    if (!configId) {
      throw new AppError('Configuration ID is required', 400);
    }

    const config = await prisma.anafConfig.findUnique({
      where: { id: configId },
    });

    if (!config) {
      throw new AppError('ANAF configuration not found', 404);
    }

    const state = Buffer.from(JSON.stringify({ configId, userId: req.user.id })).toString('base64');
    const authUrl = getAuthorizationUrl(config, state);

    return ok(res, { authorizationUrl: authUrl, state });
  })
);

// Handle OAuth callback
router.post(
  '/auth/callback',
  authenticate,
  authorize({ roles: ['admin'] }),
  validateRequest(oauthCallbackSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { code, configId } = req.validated;

    const config = await prisma.anafConfig.findUnique({
      where: { id: configId },
    });

    if (!config) {
      throw new AppError('ANAF configuration not found', 404);
    }

    const tokenData = await exchangeCodeForToken(code, config);

    return ok(res, {
      success: true,
      message: 'Successfully authenticated with ANAF',
      expiresAt: tokenData.expiresAt,
      daysUntilExpiry: tokenData.daysUntilExpiry,
    });
  })
);

// Refresh token manually
router.post(
  '/auth/refresh',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const configId = req.body.configId || req.query.configId;

    if (!configId) {
      throw new AppError('Configuration ID is required', 400);
    }

    const config = await prisma.anafConfig.findUnique({
      where: { id: configId },
      include: {
        tokens: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!config) {
      throw new AppError('ANAF configuration not found', 404);
    }

    const currentToken = config.tokens[0];
    if (!currentToken) {
      throw new AppError('No token found. Please authenticate first.', 404);
    }

    const newToken = await refreshAccessToken(currentToken.refreshToken, config);

    return ok(res, {
      success: true,
      message: 'Token refreshed successfully',
      expiresAt: newToken.expiresAt,
      daysUntilExpiry: newToken.daysUntilExpiry,
    });
  })
);

// Health check
router.get(
  '/auth/health',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const config = await getAnafConfig();
    const token = await getValidToken(config.id);
    const health = await healthCheck(token.accessToken);

    return ok(res, health);
  })
);

// ========================================
// Invoice Submission Routes
// ========================================

// Submit invoice to ANAF
router.post(
  '/invoices/:id/submit',
  authenticate,
  authorize({ roles: ['admin'] }),
  validateRequest(submitInvoiceSchema, 'body'),
  asyncHandler(async (req, res) => {
    const result = await submitInvoiceToAnaf(req.params.id, req.validated);
    return ok(res, result);
  })
);

// Get invoice sync status
router.get(
  '/invoices/:id/status',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const status = await getInvoiceSyncStatus(req.params.id);
    return ok(res, status);
  })
);

// Sync invoice status with ANAF
router.post(
  '/invoices/:id/sync',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const result = await syncInvoiceStatus(req.params.id);
    return ok(res, result);
  })
);

// Retry failed invoice submission
router.post(
  '/invoices/:id/retry',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const result = await retryFailedInvoice(req.params.id);
    return ok(res, result);
  })
);

// Validate invoice XML
router.get(
  '/invoices/:id/validate-xml',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const { xmlContent, validation } = await generateInvoiceXml(req.params.id);

    return ok(res, {
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings,
      xmlPreview: xmlContent.substring(0, 500) + '...',
    });
  })
);

// Get invoice XML
router.get(
  '/invoices/:id/xml',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const { xmlContent } = await generateInvoiceXml(req.params.id);

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${req.params.id}.xml"`);
    return res.send(xmlContent);
  })
);

// ========================================
// Message Management Routes
// ========================================

// List ANAF messages
router.get(
  '/messages',
  authenticate,
  authorize({ roles: ['admin'] }),
  validateRequest(listMessagesSchema, 'query'),
  asyncHandler(async (req, res) => {
    const result = await downloadAnafMessages(req.validated);
    return ok(res, result);
  })
);

// Get message by ID
router.get(
  '/messages/:id',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const message = await prisma.anafMessage.findUnique({
      where: { id: req.params.id },
    });

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    return ok(res, message);
  })
);

// Download message content
router.get(
  '/messages/:id/download',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const message = await prisma.anafMessage.findUnique({
      where: { id: req.params.id },
    });

    if (!message) {
      throw new AppError('Message not found', 404);
    }

    if (!message.downloadId) {
      throw new AppError('Message has no download ID', 400);
    }

    const config = await getAnafConfig();
    const token = await getValidToken(config.id);

    const buffer = await downloadMessageFromAnaf(message.downloadId, token.accessToken);

    // Update message as downloaded
    await prisma.anafMessage.update({
      where: { id: req.params.id },
      data: {
        downloaded: true,
        downloadedAt: new Date(),
      },
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="anaf-message-${message.anafMessageId}.zip"`);
    return res.send(buffer);
  })
);

// ========================================
// Sync Management Routes
// ========================================

// Batch sync pending invoices
router.post(
  '/sync/batch',
  authenticate,
  authorize({ roles: ['admin'] }),
  validateRequest(batchSyncSchema, 'body'),
  asyncHandler(async (req, res) => {
    const result = await syncPendingInvoices(req.validated);
    return ok(res, result);
  })
);

// Get sync statistics
router.get(
  '/sync/stats',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const stats = await prisma.anafInvoiceSync.groupBy({
      by: ['status'],
      _count: true,
    });

    const total = await prisma.anafInvoiceSync.count();
    const lastSync = await prisma.anafInvoiceSync.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    return ok(res, {
      total,
      byStatus: stats.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {}),
      lastSync: lastSync?.updatedAt,
    });
  })
);

// List sync records with filters
router.get(
  '/sync',
  authenticate,
  authorize({ roles: ['admin'] }),
  validateRequest(syncStatusQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, status, fromDate, toDate } = req.validated;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    const [syncs, total] = await Promise.all([
      prisma.anafInvoiceSync.findMany({
        where,
        include: {
          invoice: {
            select: {
              invoiceNumber: true,
              issueDate: true,
              total: true,
              client: {
                select: {
                  firstName: true,
                  lastName: true,
                  companyName: true,
                  type: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.anafInvoiceSync.count({ where }),
    ]);

    return ok(res, {
      data: syncs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  })
);

module.exports = router;
