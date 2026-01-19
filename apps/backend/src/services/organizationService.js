const bcrypt = require('bcryptjs');
const prisma = require('../../lib/prisma');
const { AppError } = require('../utils/errors');
const { signAccessToken, generateRefreshToken } = require('../utils/token');
const { ensureRole } = require('./roleService');
const { ACTIVITY_SECTORS, isValidSector } = require('../constants/activitySectors');

/**
 * Create a new organization with an admin user
 * This is the signup flow for new organizations
 */
const createOrganization = async ({
  organizationName,
  slug,
  email,
  password,
  firstName,
  lastName,
  phoneNumber,
  activitySector,
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

  // Check if slug is already taken
  const existingOrg = await prisma.organization.findUnique({
    where: { slug },
  });

  if (existingOrg) {
    throw new AppError('Organization slug is already taken', 409);
  }

  // Check if email is already in use
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError('Email is already in use', 409);
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

  await prisma.$transaction(async (tx) => {
    // Create organization
    organization = await tx.organization.create({
      data: {
        name: organizationName,
        slug,
        status: 'TRIAL',
        plan: 'FREE',
        trialEndsAt,
        trialStartedAt: new Date(),
        activitySector,
        settings,
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

    // Generate JWT payload
    const payload = {
      sub: userWithRoles.id,
      email: userWithRoles.email,
      name: `${userWithRoles.firstName} ${userWithRoles.lastName}`,
      roles: userWithRoles.roles.map((r) => r.role.key),
      organizationId: organization.id,
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
      },
    });
  });

  return {
    organization,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: organization.id,
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
 */
const checkOrganizationLimits = async (organizationId, resource) => {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!organization) {
    throw new AppError('Organization not found', 404);
  }

  const counts = {
    users: await prisma.user.count({ where: { organizationId } }),
    clients: await prisma.client.count({ where: { organizationId } }),
    appointments: await prisma.appointment.count({ where: { organizationId } }),
  };

  const limits = {
    users: organization.maxUsers,
    clients: organization.maxClients,
    appointments: organization.maxAppointments,
  };

  if (counts[resource] >= limits[resource]) {
    throw new AppError(
      `Organization has reached the limit for ${resource}. Please upgrade your plan.`,
      403
    );
  }

  return true;
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
  getOrganizationStats,
};
