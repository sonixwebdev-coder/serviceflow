const express = require('express');
const rateLimit = require('express-rate-limit');
const prisma = require('../../lib/prisma');
const authenticateSuperAdmin = require('../middleware/authenticateSuperAdmin');
const asyncHandler = require('../middleware/asyncHandler');
const validate = require('../middleware/validate');
const { ok } = require('../utils/http');
const { AppError } = require('../utils/errors');
const logger = require('../utils/logger');
const { getStripe } = require('../utils/stripe');
const {
  orgListQuery, orgUpdate,
  changePlan, paginationSchema, logQuery, platformSettingsUpdate,
} = require('../schemas/superAdminSchema');
const { getSettings, updateSettings, maskSecrets, invalidateCache: invalidateSettingsCache } = require('../services/platformSettingsService');
const { invalidateStripe } = require('../utils/stripe');
const supportTicketService = require('../services/supportTicketService');
const { updateTicket: updateTicketSchema, createMessage: createMessageSchema, ticketListQuery } = require('../schemas/supportSchema');

const router = express.Router();

// All routes require super admin auth
router.use(authenticateSuperAdmin);

// Write-action rate limiter (POST/PATCH): 30 req / 15 min
const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many write operations, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET',
});
router.use(writeLimiter);

// ─── Organizations ───────────────────────────────────────────────────────────

// GET /organizations - List all orgs (paginated, filterable)
router.get(
  '/organizations',
  validate(orgListQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, status, plan, sector, search } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (plan) where.plan = plan;
    if (sector) where.activitySector = sector;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, slug: true, plan: true, status: true,
          activitySector: true, createdAt: true, updatedAt: true,
          stripeCustomerId: true, subscriptionId: true,
          _count: {
            select: { users: true, clients: true, appointments: true },
          },
        },
      }),
      prisma.organization.count({ where }),
    ]);

    return ok(res, {
      organizations,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

// GET /organizations/:id - Org detail (no revenue)
router.get(
  '/organizations/:id',
  asyncHandler(async (req, res) => {
    const org = await prisma.organization.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, slug: true, plan: true, status: true,
        activitySector: true, maxUsers: true, maxClients: true, maxAppointments: true,
        stripeCustomerId: true, subscriptionId: true, subscriptionEndsAt: true,
        createdAt: true, updatedAt: true,
        _count: {
          select: { users: true, clients: true, appointments: true, invoices: true },
        },
      },
    });

    if (!org) throw new AppError('Organization not found', 404);

    return ok(res, org);
  })
);

// PATCH /organizations/:id - Update org
router.patch(
  '/organizations/:id',
  validate(orgUpdate, 'body'),
  asyncHandler(async (req, res) => {
    const org = await prisma.organization.update({
      where: { id: req.params.id },
      data: req.body,
    });

    logger.auth('Super admin updated organization', {
      userId: req.user.id,
      ip: req.ip,
      action: 'ORG_UPDATE',
      targetId: req.params.id,
      changes: req.body,
    });

    return ok(res, org, 'Organization updated');
  })
);

// POST /organizations/:id/suspend
router.post(
  '/organizations/:id/suspend',
  asyncHandler(async (req, res) => {
    const org = await prisma.organization.update({
      where: { id: req.params.id },
      data: { status: 'SUSPENDED' },
    });

    logger.auth('Super admin suspended organization', {
      userId: req.user.id,
      ip: req.ip,
      action: 'ORG_SUSPEND',
      targetId: req.params.id,
    });

    return ok(res, org, 'Organization suspended');
  })
);

// POST /organizations/:id/activate
router.post(
  '/organizations/:id/activate',
  asyncHandler(async (req, res) => {
    const org = await prisma.organization.update({
      where: { id: req.params.id },
      data: { status: 'ACTIVE' },
    });

    logger.auth('Super admin activated organization', {
      userId: req.user.id,
      ip: req.ip,
      action: 'ORG_ACTIVATE',
      targetId: req.params.id,
    });

    return ok(res, org, 'Organization activated');
  })
);

// ─── Platform Stats ──────────────────────────────────────────────────────────

// GET /stats/overview - Platform health metrics (no revenue)
router.get(
  '/stats/overview',
  asyncHandler(async (req, res) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const [
      totalOrgs, totalUsers, totalClients, totalAppointments,
      statusCounts, websiteTotal, websitePublished,
      recentSignups, errorsLast24h,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.user.count(),
      prisma.client.count(),
      prisma.appointment.count(),
      prisma.organization.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.website.count(),
      prisma.website.count({ where: { isPublished: true } }),
      prisma.organization.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.systemLog.count({ where: { level: 'ERROR', createdAt: { gte: twentyFourHoursAgo } } }),
    ]);

    // Build status breakdown
    const statusBreakdown = { active: 0, trial: 0, suspended: 0, cancelled: 0 };
    for (const row of statusCounts) {
      const key = row.status.toLowerCase();
      if (key in statusBreakdown) statusBreakdown[key] = row._count.status;
    }

    const avgUsersPerOrg = totalOrgs > 0 ? Math.round((totalUsers / totalOrgs) * 10) / 10 : 0;
    const websiteAdoptionRate = totalOrgs > 0 ? Math.round((websiteTotal / totalOrgs) * 100) : 0;

    let systemHealthStatus = 'HEALTHY';
    if (errorsLast24h > 100) systemHealthStatus = 'CRITICAL';
    else if (errorsLast24h > 20) systemHealthStatus = 'WARNING';

    return ok(res, {
      totalOrgs,
      totalUsers,
      totalClients,
      totalAppointments,
      statusBreakdown,
      avgUsersPerOrg,
      websiteAdoption: { total: websiteTotal, published: websitePublished, rate: websiteAdoptionRate },
      recentSignups,
      systemHealth: { errorsLast24h, status: systemHealthStatus },
    });
  })
);

// GET /stats/growth - New orgs/users per month (last 12 months)
router.get(
  '/stats/growth',
  asyncHandler(async (req, res) => {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const [orgs, users] = await Promise.all([
      prisma.organization.findMany({
        where: { createdAt: { gte: twelveMonthsAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.user.findMany({
        where: { createdAt: { gte: twelveMonthsAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const groupByMonth = (items) => {
      const map = {};
      items.forEach((item) => {
        const key = `${item.createdAt.getFullYear()}-${String(item.createdAt.getMonth() + 1).padStart(2, '0')}`;
        map[key] = (map[key] || 0) + 1;
      });
      return map;
    };

    return ok(res, {
      orgGrowth: groupByMonth(orgs),
      userGrowth: groupByMonth(users),
    });
  })
);

// GET /stats/plans - Distribution by plan
router.get(
  '/stats/plans',
  asyncHandler(async (req, res) => {
    const plans = await prisma.organization.groupBy({
      by: ['plan'],
      _count: { plan: true },
    });
    return ok(res, plans.map((p) => ({ plan: p.plan, count: p._count.plan })));
  })
);

// GET /stats/sectors - Distribution by sector
router.get(
  '/stats/sectors',
  asyncHandler(async (req, res) => {
    const sectors = await prisma.organization.groupBy({
      by: ['activitySector'],
      _count: { activitySector: true },
    });
    return ok(res, sectors.map((s) => ({ sector: s.activitySector, count: s._count.activitySector })));
  })
);

// GET /stats/activity - Recent admin audit events + new registrations
router.get(
  '/stats/activity',
  asyncHandler(async (req, res) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [auditEvents, recentOrgs] = await Promise.all([
      prisma.systemLog.findMany({
        where: {
          category: 'AUTH',
          createdAt: { gte: sevenDaysAgo },
          message: { startsWith: 'Super admin' },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.organization.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { id: true, name: true, slug: true, plan: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return ok(res, { auditEvents, recentOrgs });
  })
);

// ─── Billing ─────────────────────────────────────────────────────────────────

// GET /billing/overview
router.get(
  '/billing/overview',
  asyncHandler(async (req, res) => {
    const [activeOrgs, trialOrgs, cancelledOrgs] = await Promise.all([
      prisma.organization.count({ where: { status: 'ACTIVE', subscriptionId: { not: null } } }),
      prisma.organization.count({ where: { status: 'TRIAL' } }),
      prisma.organization.count({ where: { status: 'CANCELLED' } }),
    ]);

    let mrr = 0;
    const stripe = await getStripe();
    if (stripe) {
      const orgsWithSubs = await prisma.organization.findMany({
        where: { subscriptionId: { not: null }, status: 'ACTIVE' },
        select: { subscriptionId: true },
      });

      for (const org of orgsWithSubs) {
        try {
          const sub = await stripe.subscriptions.retrieve(org.subscriptionId);
          if (sub.status === 'active' && sub.items?.data?.[0]?.price?.unit_amount) {
            const amount = sub.items.data[0].price.unit_amount / 100;
            const interval = sub.items.data[0].price.recurring?.interval;
            mrr += interval === 'year' ? amount / 12 : amount;
          }
        } catch {
          // Skip
        }
      }
    }

    return ok(res, {
      mrr: Math.round(mrr * 100) / 100,
      activeSubscriptions: activeOrgs,
      trials: trialOrgs,
      churned: cancelledOrgs,
    });
  })
);

// GET /billing/subscriptions - List all orgs with billing details
router.get(
  '/billing/subscriptions',
  validate(paginationSchema, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;
    const skip = (page - 1) * limit;

    const where = { subscriptionId: { not: null } };

    const [orgs, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          status: true,
          stripeCustomerId: true,
          subscriptionId: true,
          subscriptionEndsAt: true,
          createdAt: true,
        },
      }),
      prisma.organization.count({ where }),
    ]);

    const stripe = await getStripe();
    const enriched = await Promise.all(
      orgs.map(async (org) => {
        let stripeData = null;
        if (stripe && org.subscriptionId) {
          try {
            const sub = await stripe.subscriptions.retrieve(org.subscriptionId);
            stripeData = {
              status: sub.status,
              currentPeriodEnd: sub.current_period_end
                ? new Date(sub.current_period_end * 1000)
                : null,
              amount: sub.items?.data?.[0]?.price?.unit_amount
                ? sub.items.data[0].price.unit_amount / 100
                : null,
              interval: sub.items?.data?.[0]?.price?.recurring?.interval || null,
            };
          } catch {
            // Skip
          }
        }
        return { ...org, stripe: stripeData };
      })
    );

    return ok(res, {
      subscriptions: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

// POST /billing/organizations/:id/change-plan
router.post(
  '/billing/organizations/:id/change-plan',
  validate(changePlan, 'body'),
  asyncHandler(async (req, res) => {
    const { plan } = req.body;

    const org = await prisma.organization.update({
      where: { id: req.params.id },
      data: { plan },
    });

    logger.auth('Super admin changed organization plan', {
      userId: req.user.id,
      ip: req.ip,
      action: 'PLAN_CHANGE',
      targetId: req.params.id,
      newPlan: plan,
    });

    return ok(res, org, `Plan changed to ${plan}`);
  })
);

// ─── System Logs ─────────────────────────────────────────────────────────────

// GET /logs - Paginated, filterable system logs
router.get(
  '/logs',
  validate(logQuery, 'query'),
  asyncHandler(async (req, res) => {
    const { page, limit, level, category, search, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    if (level) where.level = level;
    if (category) where.category = category;
    if (search) {
      where.message = { contains: search, mode: 'insensitive' };
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.systemLog.count({ where }),
    ]);

    return ok(res, {
      logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

// GET /logs/stats - Aggregated counts for last 24h
router.get(
  '/logs/stats',
  asyncHandler(async (req, res) => {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const [levelCounts, categoryCounts] = await Promise.all([
      prisma.systemLog.groupBy({
        by: ['level'],
        where: { createdAt: { gte: twentyFourHoursAgo } },
        _count: { level: true },
      }),
      prisma.systemLog.groupBy({
        by: ['category'],
        where: { createdAt: { gte: twentyFourHoursAgo } },
        _count: { category: true },
      }),
    ]);

    const levels = {};
    for (const row of levelCounts) levels[row.level] = row._count.level;

    const categories = {};
    for (const row of categoryCounts) categories[row.category] = row._count.category;

    return ok(res, { levels, categories });
  })
);

// ─── Platform Settings ──────────────────────────────────────────────────────

// GET /settings - Return masked settings
router.get(
  '/settings',
  asyncHandler(async (req, res) => {
    const settings = await getSettings();
    return ok(res, maskSecrets(settings));
  })
);

// PATCH /settings - Update settings
router.patch(
  '/settings',
  validate(platformSettingsUpdate, 'body'),
  asyncHandler(async (req, res) => {
    const settings = await updateSettings(req.body);

    // Invalidate stripe cache if keys changed
    if (req.body.stripeSecretKey || req.body.stripeWebhookSecret) {
      invalidateStripe();
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: req.user.id,
        action: 'SETTINGS_UPDATE',
        entityType: 'PlatformSettings',
        entityId: 'singleton',
        description: 'Super admin updated platform settings',
        ipAddress: req.ip,
        metadata: { fields: Object.keys(req.body) },
      },
    });

    logger.auth('Super admin updated platform settings', {
      userId: req.user.id,
      ip: req.ip,
      action: 'SETTINGS_UPDATE',
      fields: Object.keys(req.body),
    });

    return ok(res, maskSecrets(settings), 'Settings updated');
  })
);

// ─── Support Tickets ────────────────────────────────────────────────────────

// GET /tickets - List all tickets across orgs
router.get(
  '/tickets',
  validate(ticketListQuery, 'query'),
  asyncHandler(async (req, res) => {
    const result = await supportTicketService.listAllTickets(req.query);
    return ok(res, result);
  })
);

// GET /tickets/stats - Counts by status
router.get(
  '/tickets/stats',
  asyncHandler(async (req, res) => {
    const stats = await supportTicketService.getTicketStats();
    return ok(res, stats);
  })
);

// GET /tickets/:id - Ticket detail with messages
router.get(
  '/tickets/:id',
  asyncHandler(async (req, res) => {
    const ticket = await supportTicketService.getTicket(req.params.id);
    return ok(res, ticket);
  })
);

// PATCH /tickets/:id - Update status/priority
router.patch(
  '/tickets/:id',
  validate(updateTicketSchema, 'body'),
  asyncHandler(async (req, res) => {
    const ticket = await supportTicketService.updateTicket(req.params.id, req.body);

    logger.auth('Super admin updated support ticket', {
      userId: req.user.id,
      ip: req.ip,
      action: 'TICKET_UPDATE',
      targetId: req.params.id,
      changes: req.body,
    });

    return ok(res, ticket, 'Ticket updated');
  })
);

// POST /tickets/:id/messages - Reply as super admin
router.post(
  '/tickets/:id/messages',
  validate(createMessageSchema, 'body'),
  asyncHandler(async (req, res) => {
    const message = await supportTicketService.addMessage({
      ticketId: req.params.id,
      authorId: req.user.id,
      authorType: 'SUPER_ADMIN',
      content: req.body.content,
    });

    return ok(res, message, 'Message sent');
  })
);

module.exports = router;
