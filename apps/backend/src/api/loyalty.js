const express = require('express');
const router = express.Router();
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const { ok } = require('../utils/http');

// Restrict loyalty routes - technicians cannot access
router.use(authenticate, authorize({ permissions: ['loyalty:read'] }));
const prisma = require('../../lib/prisma');
const loyaltyService = require('../services/loyaltyService');
const { loyaltyProgramSchema, manualAdjustSchema, transactionListSchema } = require('../schemas/loyaltySchema');

/**
 * GET /api/loyalty/program
 * Get loyalty program config for the current organization
 */
router.get(
  '/program',
  authenticate,
  asyncHandler(async (req, res) => {
    const program = await loyaltyService.getProgram(prisma, req.user.organizationId);
    return ok(res, program);
  })
);

/**
 * PUT /api/loyalty/program
 * Create or update loyalty program config (admin only)
 */
router.put(
  '/program',
  authenticate,
  asyncHandler(async (req, res) => {
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const parsed = loyaltyProgramSchema.parse(req.body);
    const program = await loyaltyService.upsertProgram(prisma, req.user.organizationId, parsed);
    return ok(res, program);
  })
);

/**
 * GET /api/loyalty/accounts
 * List loyalty accounts (paginated)
 */
router.get(
  '/accounts',
  authenticate,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20 } = req.query;
    const program = await loyaltyService.getProgram(prisma, req.user.organizationId);

    if (!program) return ok(res, { items: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });

    const where = { programId: program.id };
    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      prisma.loyaltyAccount.findMany({
        where,
        include: {
          client: {
            select: {
              id: true, firstName: true, lastName: true, email: true, phone: true,
              companyName: true, type: true, fidelityCardSerie: true,
            },
          },
        },
        orderBy: { lifetimePoints: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.loyaltyAccount.count({ where }),
    ]);

    return ok(res, {
      items,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

/**
 * GET /api/loyalty/accounts/:clientId
 * Get a specific client's loyalty account
 */
router.get(
  '/accounts/:clientId',
  authenticate,
  asyncHandler(async (req, res) => {
    const account = await loyaltyService.getAccountByClientId(prisma, req.params.clientId);
    return ok(res, account);
  })
);

/**
 * POST /api/loyalty/accounts/:clientId/adjust
 * Manual point adjustment (admin only)
 */
router.post(
  '/accounts/:clientId/adjust',
  authenticate,
  asyncHandler(async (req, res) => {
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const parsed = manualAdjustSchema.parse(req.body);

    // Get or create account
    const program = await loyaltyService.getProgram(prisma, req.user.organizationId);
    if (!program) return res.status(400).json({ error: 'Loyalty program not configured' });

    const account = await loyaltyService.getOrCreateAccount(prisma, req.params.clientId, program.id);
    const result = await loyaltyService.manualAdjustPoints(prisma, {
      accountId: account.id,
      points: parsed.points,
      description: parsed.description,
    });

    return ok(res, result);
  })
);

/**
 * GET /api/loyalty/transactions
 * List all transactions (paginated)
 */
router.get(
  '/transactions',
  authenticate,
  asyncHandler(async (req, res) => {
    const parsed = transactionListSchema.parse(req.query);
    const program = await loyaltyService.getProgram(prisma, req.user.organizationId);

    if (!program) return ok(res, { items: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });

    const where = { account: { programId: program.id } };
    if (parsed.type) where.type = parsed.type;
    if (parsed.startDate || parsed.endDate) {
      where.createdAt = {};
      if (parsed.startDate) where.createdAt.gte = new Date(parsed.startDate);
      if (parsed.endDate) where.createdAt.lte = new Date(parsed.endDate);
    }

    const [items, total] = await Promise.all([
      prisma.loyaltyTransaction.findMany({
        where,
        include: {
          account: {
            include: {
              client: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parsed.page - 1) * parsed.limit,
        take: parsed.limit,
      }),
      prisma.loyaltyTransaction.count({ where }),
    ]);

    return ok(res, {
      items,
      pagination: {
        page: parsed.page,
        limit: parsed.limit,
        total,
        pages: Math.ceil(total / parsed.limit),
      },
    });
  })
);

/**
 * GET /api/loyalty/analytics
 * Get loyalty analytics
 */
router.get(
  '/analytics',
  authenticate,
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const analytics = await loyaltyService.getLoyaltyAnalytics(prisma, req.user.organizationId, { startDate, endDate });
    return ok(res, analytics);
  })
);

/**
 * GET /api/loyalty/lookup/:code
 * QR/referral code lookup
 */
router.get(
  '/lookup/:code',
  authenticate,
  asyncHandler(async (req, res) => {
    const client = await loyaltyService.lookupClientByQR(prisma, req.params.code);
    return ok(res, client);
  })
);

module.exports = router;
