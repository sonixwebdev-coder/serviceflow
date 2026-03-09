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
      return res.status(400).json({ valid: false, error: 'Codul de referral este obligatoriu' });
    }

    const account = await prisma.loyaltyAccount.findUnique({
      where: { referralCode },
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true, organizationId: true },
        },
      },
    });

    if (!account) {
      return res.json({ valid: false, error: 'Cod de referral invalid' });
    }

    // Reject self-referral during validation so the user gets immediate feedback
    if (account.clientId === req.client.id) {
      return res.json({ valid: false, error: 'Nu poti folosi propriul cod de referral' });
    }

    // Reject cross-organization codes — don't reveal they exist
    if (account.client.organizationId !== req.client.organizationId) {
      return res.json({ valid: false, error: 'Cod de referral invalid' });
    }

    const referrerName = `${account.client.firstName || ''} ${account.client.lastName || ''}`.trim();

    res.json({
      valid: true,
      referrerName: referrerName || 'Client',
    });
  })
);

/**
 * POST /api/portal/loyalty/referral/apply
 * Apply a referral code to current client
 */
router.post(
  '/referral/apply',
  authenticateClient,
  asyncHandler(async (req, res) => {
    const { referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({ error: 'Codul de referral este obligatoriu' });
    }

    const clientId = req.client.id;
    const organizationId = req.client.organizationId;

    // Guard: client not already referred
    const existingAccount = await prisma.loyaltyAccount.findUnique({
      where: { clientId },
    });
    if (existingAccount?.referredById) {
      return res.status(400).json({ error: 'Ai folosit deja un cod de referral' });
    }

    // Validate the referral code exists
    const referrerAccount = await prisma.loyaltyAccount.findUnique({
      where: { referralCode },
      include: { client: { select: { id: true, organizationId: true } } },
    });

    if (!referrerAccount) {
      return res.status(400).json({ error: 'Cod de referral invalid' });
    }

    // Guard: not self-referral
    if (referrerAccount.clientId === clientId) {
      return res.status(400).json({ error: 'Nu poti folosi propriul cod de referral' });
    }

    // Guard: same organization
    if (referrerAccount.client.organizationId !== organizationId) {
      return res.status(400).json({ error: 'Cod de referral invalid' });
    }

    // Process the referral (creates account if needed, links, awards points)
    await loyaltyService.processReferral(prisma, {
      newClientId: clientId,
      referralCode,
      organizationId,
    });

    // Get the program to return points earned
    const program = await prisma.loyaltyProgram.findUnique({
      where: { organizationId },
    });

    res.json({
      success: true,
      pointsEarned: program?.referralNewClientPts || 0,
    });
  })
);

module.exports = router;
