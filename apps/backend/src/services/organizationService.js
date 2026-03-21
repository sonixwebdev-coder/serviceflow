const bcrypt = require('bcryptjs');
const prisma = require('../../lib/prisma');
const { AppError } = require('../utils/errors');
const { signAccessToken, generateRefreshToken } = require('../utils/token');
const { ensureRole } = require('./roleService');
const { ACTIVITY_SECTORS, isValidSector } = require('../constants/activitySectors');
const { sendCrmWelcomeEmail } = require('./email/emailService');
const { getAllPlanLimits } = require('../utils/planLimits');
const logger = require('../utils/logger');

const createOrganization = async ({
  organizationName,
  slug,
  email,
  password,
  firstName,
  lastName,
  phoneNumber,
  activitySector,
  plan,
  // Company profile fields (collected during signup after VAT validation)
  vatNumber,
  companyAddress,
  companyEmail,
  companyPhone,
  entityType,
  registrationNumber,
  cnp,
}) => {
  // Validate required fields
  if (!organizationName || !slug || !email || !password || !firstName || !lastName) {
    throw new AppError('Missing required fields', 400);
  }

  // Validate activity sector (required)
  if (!activitySector) {
    throw new AppError('Activity sector is required', 400);
  }

  if (!isValidSector(activitySector)) {
    throw new AppError('Invalid activity sector', 400);
  }

  // Validate slug format (lowercase, alphanumeric, hyphens only)
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugRegex.test(slug)) {
    throw new AppError(
      'Organization slug must be lowercase alphanumeric with hyphens only',
      400
    );
  }

  // Hash password
  const hash = await bcrypt.hash(password, parseInt(process.env.HASH_SALT_ROUNDS || '10', 10));

  // Calculate trial end date (14 days from now)
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  let organization, user, accessToken, refreshToken;

  // Generate settings based on activity sector
  const sectorConfig = ACTIVITY_SECTORS[activitySector];
  const settings = {
    terminology: sectorConfig.terminology,
    features: {
      useAssets: sectorConfig.hasAssets,
      useResources: true,
      requireAssetForAppointment: false,
    },
    publicBooking: {
      workingHours: { start: 9, end: 18 },
      slotDuration: 60,
      allowWeekends: false,
    },
  };

  try {
  await prisma.$transaction(async (tx) => {
    // Create organization
    const selectedPlan = plan || 'PROFESSIONAL';
    const limits = getAllPlanLimits(selectedPlan);

    organization = await tx.organization.create({
      data: {
        name: organizationName,
        slug,
        status: 'TRIAL',
        plan: selectedPlan,
        trialEndsAt,
        trialStartedAt: new Date(),
        trialUsed: true,
        activitySector,
        settings,
        maxUsers: limits.maxUsers === Infinity ? 999999 : limits.maxUsers,
        maxClients: limits.maxClients === Infinity ? 999999 : limits.maxClients,
        maxAppointments: limits.maxAppointments === Infinity ? 999999 : limits.maxAppointments,
      },
    });

    // Ensure admin role exists
    const adminRole = await ensureRole('admin', tx);

    // Create admin user for the organization
    user = await tx.user.create({
      data: {
        organizationId: organization.id,
        email,
        password: hash,
        firstName,
        lastName,
        phoneNumber,
        employmentType: 'FULL_TIME',
        isActive: true,
      },
    });

    // Assign admin role to user
    await tx.userRole.create({
      data: {
        userId: user.id,
        roleId: adminRole.id,
      },
    });

    // Fetch user with roles for token generation
    const userWithRoles = await tx.user.findUnique({
      where: { id: user.id },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Generate JWT payload with CRM type for session isolation
    const payload = {
      sub: userWithRoles.id,
      email: userWithRoles.email,
      name: `${userWithRoles.firstName} ${userWithRoles.lastName}`,
      roles: userWithRoles.roles.map((r) => r.role.key),
      organizationId: organization.id,
      type: 'crm',
    };

    // Generate tokens
    accessToken = signAccessToken(payload);
    const { token, expiresAt } = generateRefreshToken();
    refreshToken = token;

    await tx.refreshToken.create({
      data: {
        userId: userWithRoles.id,
        token: refreshToken,
        expiresAt,
        context: 'crm',
      },
    });

    // Store company profile fields if provided (from signup with VAT validation)
    const companyFields = {
      companyName: organizationName,
      ...(vatNumber && { vatNumber }),
      ...(companyAddress && { address: companyAddress }),
      ...(companyEmail && { email: companyEmail }),
      ...(companyPhone && { phone: companyPhone }),
      ...(entityType && { entityType }),
      ...(registrationNumber && { registrationNumber }),
      ...(cnp && { cnp }),
    };

    const settingEntries = Object.entries(companyFields).filter(([, v]) => v != null && v !== '');
    if (settingEntries.length > 0) {
      await Promise.all(
        settingEntries.map(([key, value]) =>
          tx.companySetting.create({
            data: {
              name: key,
              value: { value },
              organizationId: organization.id,
            },
          })
        )
      );
    }
  });
  } catch (error) {
    if (error.code === 'P2002') {
      const field = error.meta?.target;
      if (field?.includes('slug')) throw new AppError('Organization slug is already taken', 409);
      if (field?.includes('email')) throw new AppError('Email is already in use', 409);
      throw new AppError('A resource with this data already exists', 409);
    }
    throw error;
  }

  // Send welcome email (fire-and-forget)
  sendCrmWelcomeEmail({
    email: user.email,
    userName: `${user.firstName} ${user.lastName}`,
    organizationName: organization.name,
    loginUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  }).catch((err) => logger.error('[EMAIL] CRM welcome email failed:', err.message));

  // Set lastLoginAt for the admin user (first login is right after signup)
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    organization,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: organization.id,
      orgStatus: organization.status,
      role: 'admin',
      roles: [{ role: { key: 'admin' } }],
    },
    accessToken,
    refreshToken,
  };
};

/**
 * Get organization by ID
 */
const getOrganizationById = async (organizationId) => {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      _count: {
        select: {
          users: true,
          clients: true,
          appointments: true,
          invoices: true,
        },
      },
    },
  });

  if (!organization) {
    throw new AppError('Organization not found', 404);
  }

  return organization;
};

/**
 * Update organization settings
 */
const updateOrganization = async (organizationId, data) => {
  try {
    const organization = await prisma.organization.update({
      where: { id: organizationId },
      data: {
        name: data.name,
        settings: data.settings,
      },
    });

    return organization;
  } catch (error) {
    if (error.code === 'P2025') {
      throw new AppError('Organization not found', 404);
    }
    throw error;
  }
};

/**
 * Check if organization has reached usage limits
 * Appointments are monthly quotas (reset on 1st of each month)
 * Clients are lifetime accumulative (no reset)
 * Users are concurrent seats (no reset)
 */
const checkOrganizationLimits = async (organizationId, resource) => {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    throw new AppError('Organizatia nu a fost gasita', 404);
  }

  const baseLimit = {
    users: organization.maxUsers,
    clients: organization.maxClients,
    appointments: organization.maxAppointments,
  }[resource];

  // Skip for unlimited (ENTERPRISE stores 999999)
  if (baseLimit >= 999999) return true;

  // Get active add-on boosts for this resource
  const now = new Date();
  const addons = await prisma.quotaAddon.findMany({
    where: {
      organizationId,
      resource,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  });
  const addonBoost = addons.reduce((sum, a) => sum + a.amount, 0);
  const effectiveLimit = baseLimit + addonBoost;

  // Count current usage
  let count;
  if (resource === 'appointments') {
    // Monthly: count only appointments created this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    count = await prisma.appointment.count({
      where: { organizationId, createdAt: { gte: startOfMonth } },
    });
  } else if (resource === 'clients') {
    count = await prisma.client.count({ where: { organizationId } });
  } else {
    count = await prisma.user.count({ where: { organizationId } });
  }

  if (count >= effectiveLimit) {
    const labels = { users: 'utilizatori', clients: 'clienti', appointments: 'programari' };
    throw new AppError(
      `Ati atins limita de ${labels[resource]} (${effectiveLimit}). Upgradati planul sau achizitionati un pachet suplimentar.`,
      403
    );
  }
  return true;
};

/**
 * Get remaining quota for a resource (useful for bulk operations)
 */
const getRemainingQuota = async (organizationId, resource) => {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    throw new AppError('Organizatia nu a fost gasita', 404);
  }

  const baseLimit = {
    users: organization.maxUsers,
    clients: organization.maxClients,
    appointments: organization.maxAppointments,
  }[resource];

  const now = new Date();

  // Count actual usage regardless of plan
  let used;
  if (resource === 'appointments') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    used = await prisma.appointment.count({
      where: { organizationId, createdAt: { gte: startOfMonth } },
    });
  } else if (resource === 'clients') {
    used = await prisma.client.count({ where: { organizationId } });
  } else {
    used = await prisma.user.count({ where: { organizationId } });
  }

  // Unlimited
  if (baseLimit >= 999999) {
    return { limit: Infinity, used, remaining: Infinity, addonBoost: 0 };
  }

  const addons = await prisma.quotaAddon.findMany({
    where: {
      organizationId,
      resource,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  });
  const addonBoost = addons.reduce((sum, a) => sum + a.amount, 0);
  const effectiveLimit = baseLimit + addonBoost;

  return {
    limit: effectiveLimit,
    used,
    remaining: Math.max(0, effectiveLimit - used),
    addonBoost,
  };
};

/**
 * Get full quota usage for all resources (for billing page)
 */
const getQuotaUsage = async (organizationId) => {
  const [users, clients, appointments] = await Promise.all([
    getRemainingQuota(organizationId, 'users'),
    getRemainingQuota(organizationId, 'clients'),
    getRemainingQuota(organizationId, 'appointments'),
  ]);
  return { users, clients, appointments };
};

/**
 * Get organization statistics
 */
const getOrganizationStats = async (organizationId) => {
  const [
    userCount,
    clientCount,
    appointmentCount,
    invoiceCount,
    activeAppointmentCount,
  ] = await Promise.all([
    prisma.user.count({ where: { organizationId } }),
    prisma.client.count({ where: { organizationId } }),
    prisma.appointment.count({ where: { organizationId } }),
    prisma.invoice.count({ where: { organizationId } }),
    prisma.appointment.count({
      where: {
        organizationId,
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS'],
        },
      },
    }),
  ]);

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  return {
    counts: {
      users: userCount,
      clients: clientCount,
      appointments: appointmentCount,
      invoices: invoiceCount,
      activeAppointments: activeAppointmentCount,
    },
    limits: {
      users: organization.maxUsers,
      clients: organization.maxClients,
      appointments: organization.maxAppointments,
    },
    plan: organization.plan,
    status: organization.status,
    trialEndsAt: organization.trialEndsAt,
  };
};

module.exports = {
  createOrganization,
  getOrganizationById,
  updateOrganization,
  checkOrganizationLimits,
  getRemainingQuota,
  getQuotaUsage,
  getOrganizationStats,
};
