const crypto = require('crypto');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');
const { createNotification } = require('./notificationService');
const { sendEmail } = require('./email/emailService');

/**
 * Generate a unique referral code (REF-XXXXXX)
 */
const generateReferralCode = () => {
  const bytes = crypto.randomBytes(4);
  const code = bytes.toString('hex').toUpperCase().slice(0, 6);
  return `REF-${code}`;
};

/**
 * Get organization's loyalty program config
 */
const getProgram = async (prisma, orgId) => {
  return prisma.loyaltyProgram.findUnique({
    where: { organizationId: orgId },
  });
};

/**
 * Create or update the loyalty program for an organization
 */
const upsertProgram = async (prisma, orgId, config) => {
  return prisma.loyaltyProgram.upsert({
    where: { organizationId: orgId },
    update: config,
    create: {
      organizationId: orgId,
      ...config,
    },
  });
};

/**
 * Get or create a loyalty account for a client
 */
const getOrCreateAccount = async (prisma, clientId, programId) => {
  // Check if account already exists
  const existingAccount = await prisma.loyaltyAccount.findUnique({
    where: { clientId },
  });
  if (existingAccount) return existingAccount;

  // Use sufficient entropy to avoid collisions without a DB lookup loop
  const referralCode = generateReferralCode();

  // Handle concurrent creation race condition: if another request created
  // the account between our findUnique and create, catch P2002 and re-fetch
  let account;
  let wasCreated = false;
  try {
    account = await prisma.loyaltyAccount.create({
      data: {
        clientId,
        programId,
        referralCode,
      },
    });
    wasCreated = true;
  } catch (err) {
    if (err.code === 'P2002') {
      // Another concurrent request created the account first - fetch it
      account = await prisma.loyaltyAccount.findUnique({ where: { clientId } });
      if (!account) throw err; // unexpected - re-throw
      return account;
    }
    throw err;
  }

  // Post-creation side-effects only run when the account was actually just created
  if (wasCreated) {
    const clientData = await prisma.client.findUnique({
      where: { id: clientId },
      select: { fidelityCardSerie: true, firstName: true, lastName: true, organizationId: true },
    });

    // Auto-generate fidelityCardSerie if client doesn't have one
    if (clientData && !clientData.fidelityCardSerie) {
      const cardNumber = `FC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      await prisma.client.update({
        where: { id: clientId },
        data: { fidelityCardSerie: cardNumber },
      });
    }

    // Notify admins/managers about the new loyalty account
    if (clientData?.organizationId) {
      try {
        const clientName =
          `${clientData.firstName || ''} ${clientData.lastName || ''}`.trim() || 'Client';
        const admins = await prisma.user.findMany({
          where: {
            organizationId: clientData.organizationId,
            isActive: true,
            roles: { some: { role: { key: { in: ['admin', 'manager'] } } } },
          },
          select: { id: true },
        });
        for (const admin of admins) {
          await createNotification({
            recipientId: admin.id,
            title: 'Cont fidelitate nou',
            message: `Clientul ${clientName} a primit un cont de fidelitate.`,
            type: 'SYSTEM',
            entityType: 'loyaltyAccount',
            entityId: account.id,
            organizationId: clientData.organizationId,
          });
        }
      } catch (err) {
        logger.error('[LOYALTY] Failed to send new account notifications:', err.message);
      }
    }
  }

  return account;
};

/**
 * Get loyalty account by client ID
 */
const getAccountByClientId = async (prisma, clientId) => {
  return prisma.loyaltyAccount.findUnique({
    where: { clientId },
    include: {
      program: true,
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
      referrals: {
        include: {
          client: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });
};

/**
 * Recalculate tier based on lifetime points
 */
const recalculateTier = async (prisma, accountId) => {
  const account = await prisma.loyaltyAccount.findUnique({
    where: { id: accountId },
    include: {
      program: true,
      client: {
        select: { id: true, firstName: true, lastName: true, email: true, organizationId: true },
      },
    },
  });

  if (!account || !account.program) return account;

  const { lifetimePoints } = account;
  const { bronzeThreshold, silverThreshold, goldThreshold, platinumThreshold } = account.program;

  let newTier = 'BRONZE';
  if (lifetimePoints >= Number(platinumThreshold)) newTier = 'PLATINUM';
  else if (lifetimePoints >= Number(goldThreshold)) newTier = 'GOLD';
  else if (lifetimePoints >= Number(silverThreshold)) newTier = 'SILVER';
  else if (lifetimePoints >= Number(bronzeThreshold)) newTier = 'BRONZE';

  if (newTier !== account.currentTier) {
    const updated = await prisma.loyaltyAccount.update({
      where: { id: accountId },
      data: { currentTier: newTier },
    });

    // Fire-and-forget tier upgrade email
    try {
      if (account.client?.email && account.client?.organizationId) {
        const clientName =
          `${account.client.firstName || ''} ${account.client.lastName || ''}`.trim() || 'Client';
        const tierNames = {
          BRONZE: 'Bronze',
          SILVER: 'Silver',
          GOLD: 'Gold',
          PLATINUM: 'Platinum',
        };
        await sendEmail(prisma, {
          to: account.client.email,
          template: 'loyalty-tier-upgrade',
          templateData: {
            clientName,
            tierName: tierNames[newTier],
            previousTier: tierNames[account.currentTier],
          },
          recipientType: 'CLIENT',
          recipientId: account.client.id,
          organizationId: account.client.organizationId,
        });
      }
    } catch (err) {
      logger.error('[LOYALTY] Failed to send tier upgrade email:', err.message);
    }

    return updated;
  }

  return account;
};

/**
 * Award points for a payment
 */
const awardPointsForPayment = async (prisma, { paymentId, clientId, amount, organizationId }) => {
  try {
    const program = await prisma.loyaltyProgram.findUnique({
      where: { organizationId },
    });

    if (!program || !program.isEnabled) return null;

    const account = await getOrCreateAccount(prisma, clientId, program.id);
    const points = Math.floor(Number(amount) * Number(program.pointsPerRon));

    if (points <= 0) return null;

    // Use atomic increment inside an interactive transaction to prevent
    // the read-modify-write race condition under concurrent payments
    const [updatedAccount, transaction] = await prisma.$transaction(async (tx) => {
      const updated = await tx.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          currentPoints: { increment: points },
          lifetimePoints: { increment: points },
        },
      });
      const txRecord = await tx.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          type: 'EARN_PAYMENT',
          points,
          balanceAfter: updated.currentPoints, // reflects the atomically updated value
          description: `Puncte castigate pentru plata de ${Number(amount).toFixed(2)} RON`,
          paymentId,
        },
      });
      return [updated, txRecord];
    });

    // Recalculate tier
    await recalculateTier(prisma, account.id);

    // Fire-and-forget points earned email
    try {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { email: true, firstName: true, lastName: true },
      });
      if (client?.email) {
        const clientName = `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Client';
        await sendEmail(prisma, {
          to: client.email,
          template: 'loyalty-points-earned',
          templateData: {
            clientName,
            points,
            totalPoints: updatedAccount.currentPoints,
            amount: Number(amount).toFixed(2),
          },
          recipientType: 'CLIENT',
          recipientId: clientId,
          organizationId,
        });
      }
    } catch (err) {
      logger.error('[LOYALTY] Failed to send points earned email:', err.message);
    }

    return { updatedAccount, transaction };
  } catch (error) {
    logger.error('[LOYALTY] Failed to award points for payment:', error.message);
    return null;
  }
};

/**
 * Get tier discount for a client
 */
const getTierDiscount = async (prisma, clientId) => {
  try {
    const account = await prisma.loyaltyAccount.findUnique({
      where: { clientId },
      include: { program: true },
    });

    if (!account || !account.program || !account.program.isEnabled) return null;

    const discountMap = {
      BRONZE: Number(account.program.bronzeDiscount),
      SILVER: Number(account.program.silverDiscount),
      GOLD: Number(account.program.goldDiscount),
      PLATINUM: Number(account.program.platinumDiscount),
    };

    return {
      tier: account.currentTier,
      discountPercent: discountMap[account.currentTier] || 0,
    };
  } catch (error) {
    logger.error('[LOYALTY] Failed to get tier discount:', error.message);
    return null;
  }
};

/**
 * Record a completed visit and check for visit rewards
 */
const recordCompletedVisit = async (prisma, { clientId, appointmentId }) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { organizationId: true, email: true, firstName: true, lastName: true },
    });

    if (!client?.organizationId) return null;

    const program = await prisma.loyaltyProgram.findUnique({
      where: { organizationId: client.organizationId },
    });

    if (!program || !program.isEnabled) return null;

    const account = await getOrCreateAccount(prisma, clientId, program.id);
    const newVisits = account.completedVisits + 1;

    await prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: { completedVisits: newVisits },
    });

    // Check visit reward
    if (program.visitRewardEnabled && newVisits % program.visitRewardEveryN === 0) {
      let rewardPoints = 0;
      let description = '';

      if (program.visitRewardType === 'BONUS_POINTS') {
        rewardPoints = Math.floor(Number(program.visitRewardValue));
        description = `Recompensa pentru ${newVisits} vizite: +${rewardPoints} puncte bonus`;
      } else if (program.visitRewardType === 'DISCOUNT_PERCENT') {
        description = `Recompensa pentru ${newVisits} vizite: ${Number(program.visitRewardValue)}% reducere la urmatoarea vizita`;
      } else if (program.visitRewardType === 'DISCOUNT_FIXED') {
        description = `Recompensa pentru ${newVisits} vizite: ${Number(program.visitRewardValue)} RON reducere`;
      } else if (program.visitRewardType === 'FREE_APPOINTMENT') {
        description = `Recompensa pentru ${newVisits} vizite: programare gratuita`;
      }

      if (rewardPoints > 0) {
        const newBalance = account.currentPoints + rewardPoints;
        const newLifetime = account.lifetimePoints + rewardPoints;

        await prisma.$transaction([
          prisma.loyaltyAccount.update({
            where: { id: account.id },
            data: {
              currentPoints: newBalance,
              lifetimePoints: newLifetime,
            },
          }),
          prisma.loyaltyTransaction.create({
            data: {
              accountId: account.id,
              type: 'REDEEM_REWARD',
              points: rewardPoints,
              balanceAfter: newBalance,
              description,
              appointmentId,
            },
          }),
        ]);

        await recalculateTier(prisma, account.id);
      }

      // Fire-and-forget reward notification email
      try {
        if (client.email) {
          const clientName =
            `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Client';
          await sendEmail(prisma, {
            to: client.email,
            template: 'loyalty-reward-available',
            templateData: {
              clientName,
              visitCount: newVisits,
              rewardDescription: description,
            },
            recipientType: 'CLIENT',
            recipientId: clientId,
            organizationId: client.organizationId,
          });
        }
      } catch (err) {
        logger.error('[LOYALTY] Failed to send reward email:', err.message);
      }
    }

    return { completedVisits: newVisits };
  } catch (error) {
    logger.error('[LOYALTY] Failed to record completed visit:', error.message);
    return null;
  }
};

/**
 * Process a referral
 */
const processReferral = async (prisma, { newClientId, referralCode, organizationId }) => {
  try {
    if (!referralCode) return null;

    const program = await prisma.loyaltyProgram.findUnique({
      where: { organizationId },
    });

    if (!program || !program.isEnabled || !program.referralEnabled) return null;

    // Find the referrer account
    const referrerAccount = await prisma.loyaltyAccount.findUnique({
      where: { referralCode },
      include: { client: { select: { id: true, organizationId: true } } },
    });

    if (!referrerAccount) return null;

    // Ensure same organization
    if (referrerAccount.client.organizationId !== organizationId) return null;

    // Prevent self-referral
    if (referrerAccount.clientId === newClientId) return null;

    // Create account for new client and link referral
    const newAccount = await getOrCreateAccount(prisma, newClientId, program.id);

    // Update new client's referredById
    await prisma.loyaltyAccount.update({
      where: { id: newAccount.id },
      data: { referredById: referrerAccount.id },
    });

    // Award points to referrer
    if (program.referralBonusPoints > 0) {
      const referrerBalance = referrerAccount.currentPoints + program.referralBonusPoints;
      const referrerLifetime = referrerAccount.lifetimePoints + program.referralBonusPoints;

      await prisma.$transaction([
        prisma.loyaltyAccount.update({
          where: { id: referrerAccount.id },
          data: {
            currentPoints: referrerBalance,
            lifetimePoints: referrerLifetime,
          },
        }),
        prisma.loyaltyTransaction.create({
          data: {
            accountId: referrerAccount.id,
            type: 'EARN_REFERRAL',
            points: program.referralBonusPoints,
            balanceAfter: referrerBalance,
            description: 'Puncte bonus pentru recomandare client nou',
            referredClientId: newClientId,
          },
        }),
      ]);

      await recalculateTier(prisma, referrerAccount.id);
    }

    // Award points to new client
    if (program.referralNewClientPts > 0) {
      const newClientBalance = newAccount.currentPoints + program.referralNewClientPts;
      const newClientLifetime = newAccount.lifetimePoints + program.referralNewClientPts;

      await prisma.$transaction([
        prisma.loyaltyAccount.update({
          where: { id: newAccount.id },
          data: {
            currentPoints: newClientBalance,
            lifetimePoints: newClientLifetime,
          },
        }),
        prisma.loyaltyTransaction.create({
          data: {
            accountId: newAccount.id,
            type: 'EARN_REFERRAL',
            points: program.referralNewClientPts,
            balanceAfter: newClientBalance,
            description: 'Puncte bonus de bun-venit (cod referral)',
          },
        }),
      ]);
    }

    return { success: true };
  } catch (error) {
    logger.error('[LOYALTY] Failed to process referral:', error.message);
    return null;
  }
};

/**
 * Manual point adjustment by admin
 */
const manualAdjustPoints = async (prisma, { accountId, points, description }) => {
  const account = await prisma.loyaltyAccount.findUnique({
    where: { id: accountId },
  });

  if (!account) throw new AppError('Loyalty account not found', 404);

  const newBalance = account.currentPoints + points;
  if (newBalance < 0) throw new AppError('Insufficient points balance', 400);

  const type = points > 0 ? 'EARN_MANUAL' : 'DEDUCT_MANUAL';

  const [updatedAccount, transaction] = await prisma.$transaction([
    prisma.loyaltyAccount.update({
      where: { id: accountId },
      data: {
        currentPoints: newBalance,
        lifetimePoints: points > 0 ? account.lifetimePoints + points : account.lifetimePoints,
      },
    }),
    prisma.loyaltyTransaction.create({
      data: {
        accountId,
        type,
        points,
        balanceAfter: newBalance,
        description: description || (points > 0 ? 'Ajustare manuala (+)' : 'Ajustare manuala (-)'),
      },
    }),
  ]);

  if (points > 0) {
    await recalculateTier(prisma, accountId);
  }

  return { account: updatedAccount, transaction };
};

/**
 * Get client loyalty dashboard data
 */
const getClientLoyaltyDashboard = async (prisma, clientId) => {
  const account = await prisma.loyaltyAccount.findUnique({
    where: { clientId },
    include: {
      program: true,
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      referrals: {
        include: {
          client: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      },
    },
  });

  if (!account) return null;

  const program = account.program;
  const thresholds = {
    BRONZE: Number(program.bronzeThreshold),
    SILVER: Number(program.silverThreshold),
    GOLD: Number(program.goldThreshold),
    PLATINUM: Number(program.platinumThreshold),
  };

  const tierOrder = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
  const currentIndex = tierOrder.indexOf(account.currentTier);
  const nextTier = currentIndex < tierOrder.length - 1 ? tierOrder[currentIndex + 1] : null;
  const nextThreshold = nextTier ? thresholds[nextTier] : null;
  const progressToNext = nextThreshold
    ? Math.min(100, Math.round((account.lifetimePoints / nextThreshold) * 100))
    : 100;

  return {
    account: {
      id: account.id,
      currentPoints: account.currentPoints,
      lifetimePoints: account.lifetimePoints,
      currentTier: account.currentTier,
      completedVisits: account.completedVisits,
      referralCode: account.referralCode,
    },
    program: {
      isEnabled: program.isEnabled,
      pointsPerRon: Number(program.pointsPerRon),
      bronzeThreshold: Number(program.bronzeThreshold),
      silverThreshold: Number(program.silverThreshold),
      goldThreshold: Number(program.goldThreshold),
      platinumThreshold: Number(program.platinumThreshold),
      visitRewardEnabled: program.visitRewardEnabled,
      visitRewardEveryN: program.visitRewardEveryN,
      visitRewardType: program.visitRewardType,
      visitRewardValue: Number(program.visitRewardValue),
      referralEnabled: program.referralEnabled,
    },
    tier: {
      current: account.currentTier,
      next: nextTier,
      nextThreshold,
      progressToNext,
      discount:
        {
          BRONZE: Number(program.bronzeDiscount),
          SILVER: Number(program.silverDiscount),
          GOLD: Number(program.goldDiscount),
          PLATINUM: Number(program.platinumDiscount),
        }[account.currentTier] || 0,
    },
    transactions: account.transactions,
    referrals: account.referrals.map((r) => ({
      id: r.id,
      clientName: `${r.client.firstName || ''} ${r.client.lastName || ''}`.trim(),
      createdAt: r.createdAt,
    })),
  };
};

/**
 * Get paginated transaction history
 */
const getTransactionHistory = async (
  prisma,
  accountId,
  { page = 1, limit = 20, type, startDate, endDate } = {}
) => {
  const where = { accountId };
  if (type) where.type = type;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [items, total] = await Promise.all([
    prisma.loyaltyTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.loyaltyTransaction.count({ where }),
  ]);

  return {
    items,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

/**
 * Get loyalty analytics for an organization
 */
const getLoyaltyAnalytics = async (prisma, orgId, { startDate, endDate } = {}) => {
  const program = await prisma.loyaltyProgram.findUnique({
    where: { organizationId: orgId },
  });

  if (!program) return null;

  // Tier distribution
  const tierDistribution = await prisma.loyaltyAccount.groupBy({
    by: ['currentTier'],
    where: { programId: program.id },
    _count: true,
  });

  // Total accounts
  const totalAccounts = await prisma.loyaltyAccount.count({
    where: { programId: program.id },
  });

  // Points in circulation
  const pointsAgg = await prisma.loyaltyAccount.aggregate({
    where: { programId: program.id },
    _sum: { currentPoints: true, lifetimePoints: true },
  });

  // Recent transactions
  const transactionWhere = {
    account: { programId: program.id },
  };
  if (startDate || endDate) {
    transactionWhere.createdAt = {};
    if (startDate) transactionWhere.createdAt.gte = new Date(startDate);
    if (endDate) transactionWhere.createdAt.lte = new Date(endDate);
  }

  const transactionsByType = await prisma.loyaltyTransaction.groupBy({
    by: ['type'],
    where: transactionWhere,
    _count: true,
    _sum: { points: true },
  });

  // Referral stats
  const totalReferrals = await prisma.loyaltyAccount.count({
    where: {
      programId: program.id,
      referredById: { not: null },
    },
  });

  // Top referrers
  const topReferrers = await prisma.loyaltyAccount.findMany({
    where: {
      programId: program.id,
      referrals: { some: {} },
    },
    include: {
      client: {
        select: { id: true, firstName: true, lastName: true },
      },
      _count: { select: { referrals: true } },
    },
    orderBy: { referrals: { _count: 'desc' } },
    take: 10,
  });

  return {
    totalAccounts,
    pointsInCirculation: pointsAgg._sum.currentPoints || 0,
    totalLifetimePoints: pointsAgg._sum.lifetimePoints || 0,
    tierDistribution: tierDistribution.map((t) => ({
      tier: t.currentTier,
      count: t._count,
    })),
    transactionsByType: transactionsByType.map((t) => ({
      type: t.type,
      count: t._count,
      totalPoints: t._sum.points || 0,
    })),
    totalReferrals,
    topReferrers: topReferrers.map((r) => ({
      clientId: r.client.id,
      clientName: `${r.client.firstName || ''} ${r.client.lastName || ''}`.trim(),
      referralCount: r._count.referrals,
      referralCode: r.referralCode,
    })),
  };
};

/**
 * Lookup client by QR code data (clientId or fidelityCardSerie)
 */
const lookupClientByQR = async (prisma, data) => {
  // Try as clientId first
  let client = await prisma.client.findUnique({
    where: { id: data },
    include: { loyaltyAccount: { include: { program: true } } },
  });

  if (client) return client;

  // Try as fidelityCardSerie
  client = await prisma.client.findFirst({
    where: { fidelityCardSerie: data },
    include: { loyaltyAccount: { include: { program: true } } },
  });

  return client;
};

module.exports = {
  getProgram,
  upsertProgram,
  getOrCreateAccount,
  getAccountByClientId,
  awardPointsForPayment,
  recalculateTier,
  getTierDiscount,
  recordCompletedVisit,
  processReferral,
  manualAdjustPoints,
  getClientLoyaltyDashboard,
  getTransactionHistory,
  getLoyaltyAnalytics,
  lookupClientByQR,
  generateReferralCode,
};
