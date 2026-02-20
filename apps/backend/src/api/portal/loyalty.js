const express = require('express');
const router = express.Router();
const asyncHandler = require('../../middleware/asyncHandler');
const authenticateClient = require('../../middleware/authenticateClient');
const prisma = require('../../../lib/prisma');
const loyaltyService = require('../../services/loyaltyService');
const { transactionListSchema } = require('../../schemas/loyaltySchema');

/**
 * GET /api/portal/loyalty/dashboard
 * Get client's loyalty dashboard
 */
router.get(
  '/dashboard',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const dashboard = await loyaltyService.getClientLoyaltyDashboard(prisma, req.client.id);
    res.json(dashboard);
  })
);

/**
 * GET /api/portal/loyalty/transactions
 * Get client's transaction history
 */
router.get(
  '/transactions',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const parsed = transactionListSchema.parse(req.query);

    const account = await prisma.loyaltyAccount.findUnique({
      where: { clientId: req.client.id },
    });

    if (!account) {
      return res.json({ items: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } });
    }

    const result = await loyaltyService.getTransactionHistory(prisma, account.id, parsed);
    res.json(result);
  })
);

/**
 * GET /api/portal/loyalty/referral
 * Get client's referral code and stats
 */
router.get(
  '/referral',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const account = await prisma.loyaltyAccount.findUnique({
      where: { clientId: req.client.id },
      include: {
        referrals: {
          include: {
            client: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!account) {
      return res.json({ referralCode: null, referralCount: 0, referrals: [] });
    }

    res.json({
      referralCode: account.referralCode,
      referralCount: account.referrals.length,
      referrals: account.referrals.map((r) => ({
        clientName: `${r.client.firstName || ''} ${r.client.lastName || ''}`.trim(),
        createdAt: r.createdAt,
      })),
    });
  })
);

/**
 * POST /api/portal/loyalty/referral/validate
 * Validate a referral code
 */
router.post(
  '/referral/validate',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({ valid: false, error: 'Referral code is required' });
    }

    const account = await prisma.loyaltyAccount.findUnique({
      where: { referralCode },
      include: {
        client: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    if (!account) {
      return res.json({ valid: false });
    }

    const referrerName = `${account.client.firstName || ''} ${account.client.lastName || ''}`.trim();

    res.json({
      valid: true,
      referrerName: referrerName || 'Client',
    });
  })
);

module.exports = router;
