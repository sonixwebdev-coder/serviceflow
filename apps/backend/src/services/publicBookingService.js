const { AppError } = require('../utils/errors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { emitToOrganization } = require('../realtime/emitter');
const { ACTIVITY_SECTORS, getSectorConfig } = require('../constants/activitySectors');

const SALT_ROUNDS = 10;
const DEFAULT_WORK_START = 9; // 9 AM
const DEFAULT_WORK_END = 18; // 6 PM
const DEFAULT_SLOT_INTERVAL = 30; // 30 minutes

/**
 * Get organization by slug for public access
 */
const getOrganizationBySlug = async (prisma, slug) => {
  const organization = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      settings: true,
      activitySector: true,
    },
  });

  if (!organization) {
    throw new AppError('Organization not found', 404);
  }

  // Get active locations for this organization
  const locations = await prisma.location.findMany({
    where: {
      organizationId: organization.id,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      city: true,
      county: true,
      phone: true,
      isPrimary: true,
    },
    orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
  });

  // Get sector configuration
  const sectorConfig = getSectorConfig(organization.activitySector);

  // Parse settings with defaults - settings are nested under publicBooking key
  const orgSettings = organization.settings || {};
  const pbSettings = orgSettings.publicBooking || {};

  const publicBookingSettings = {
    workingHours: {
      start: pbSettings.workingHours?.start ?? DEFAULT_WORK_START,
      end: pbSettings.workingHours?.end ?? DEFAULT_WORK_END,
    },
    slotDuration: pbSettings.slotDuration || 60,
    allowWeekends: pbSettings.allowWeekends || false,
  };

  return {
    ...organization,
    locations,
    hasMultipleLocations: locations.length > 1,
    sectorConfig,
    publicBookingSettings,
  };
};

/**
 * Get a system user for public bookings (first admin in the organization)
 */
const getSystemUserForOrg = async (prisma, organizationId) => {
  // Find an admin user in this organization
  const adminUser = await prisma.user.findFirst({
    where: {
      organizationId,
      isActive: true,
      roles: {
        some: {
          role: {
            key: 'admin',
          },
        },
      },
    },
    select: { id: true },
  });

  if (!adminUser) {
    // Fallback to any active user in the organization
    const anyUser = await prisma.user.findFirst({
      where: {
        organizationId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!anyUser) {
      throw new AppError('No users found in organization to process booking', 500);
    }

    return anyUser;
  }

  return adminUser;
};

/**
 * Get total capacity from active resources (ramps)
 * Optionally filtered by location
 */
const getOrganizationCapacity = async (prisma, organizationId, locationId = null) => {
  const resourceWhere = {
    organizationId,
    isActive: true,
  };

  // Filter by location if specified
  if (locationId) {
    resourceWhere.locationId = locationId;
  }

  const resources = await prisma.resource.findMany({
    where: resourceWhere,
    select: {
      id: true,
      name: true,
      capacity: true,
      locationId: true,
    },
  });

  // Sum of all capacities, or default to 1 if no resources configured
  const totalCapacity = resources.reduce((sum, r) => sum + r.capacity, 0) || 1;

  return { resources, totalCapacity };
};

/**
 * Get available time slots for booking
 */
const getAvailableSlots = async (prisma, { organizationId, date, duration = 60, settings = null, locationId = null }) => {
  // Parse date as local date (not UTC)
  const [year, month, day] = date.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);

  const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
  const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

  // Get organization's resource capacity (optionally filtered by location)
  const { totalCapacity } = await getOrganizationCapacity(prisma, organizationId, locationId);

  // Build appointment query with optional location filter
  const appointmentWhere = {
    organizationId,
    scheduledStart: {
      gte: startOfDay,
      lte: endOfDay,
    },
    status: {
      notIn: ['CANCELLED'],
    },
  };

  // Filter by location if specified
  if (locationId) {
    appointmentWhere.locationId = locationId;
  }

  // Get existing appointments for the day (not cancelled)
  const existingAppointments = await prisma.appointment.findMany({
    where: appointmentWhere,
    select: {
      scheduledStart: true,
      scheduledEnd: true,
      resourceId: true,
      locationId: true,
    },
  });

  // Use organization settings if provided, otherwise use defaults
  const workStart = settings?.workingHours?.start ?? DEFAULT_WORK_START;
  const workEnd = settings?.workingHours?.end ?? DEFAULT_WORK_END;
  const slotInterval = DEFAULT_SLOT_INTERVAL;

  // Generate time slots
  const slots = [];

  for (let hour = workStart; hour < workEnd; hour++) {
    for (let minute = 0; minute < 60; minute += slotInterval) {
      const slotStart = new Date(year, month - 1, day, hour, minute, 0, 0);
      const slotEnd = new Date(slotStart);
      slotEnd.setMinutes(slotEnd.getMinutes() + duration);

      // Skip if slot ends after work hours
      if (slotEnd.getHours() > workEnd || (slotEnd.getHours() === workEnd && slotEnd.getMinutes() > 0)) {
        continue;
      }

      // Check if slot is in the past
      if (slotStart < new Date()) {
        continue;
      }

      // Count how many appointments overlap with this slot
      const overlappingCount = existingAppointments.filter((apt) => {
        const aptStart = new Date(apt.scheduledStart);
        const aptEnd = new Date(apt.scheduledEnd);
        return (
          (slotStart >= aptStart && slotStart < aptEnd) ||
          (slotEnd > aptStart && slotEnd <= aptEnd) ||
          (slotStart <= aptStart && slotEnd >= aptEnd)
        );
      }).length;

      // Slot is available if there's remaining capacity
      const availableCapacity = totalCapacity - overlappingCount;
      if (availableCapacity > 0) {
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          formatted: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
          availableCapacity,
        });
      }
    }
  }

  return slots;
};

/**
 * Create a public booking (appointment + client + asset if applicable)
 */
const createPublicBooking = async (prisma, {
  organizationId,
  clientData,
  appointmentData,
  assetData,
  createAccount,
  password,
  locationId,
}) => {
  // Get organization to determine if assets are needed
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { activitySector: true },
  });

  const sectorConfig = getSectorConfig(organization.activitySector);
  const hasAssets = sectorConfig?.hasAssets ?? false;
  const assetType = sectorConfig?.assetType || null;

  // Get a system user for createdById (required field)
  const systemUser = await getSystemUserForOrg(prisma, organizationId);

  // Check if client with this email already exists for this organization
  let client = await prisma.client.findFirst({
    where: {
      organizationId,
      email: clientData.email.toLowerCase(),
    },
  });

  // Start a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create or update client
    if (!client) {
      client = await tx.client.create({
        data: {
          organization: { connect: { id: organizationId } },
          firstName: clientData.firstName,
          lastName: clientData.lastName,
          email: clientData.email.toLowerCase(),
          phone: clientData.phone,
          type: 'PF',
        },
      });
    }

    // Create asset if sector uses assets and data is provided
    let asset = null;
    if (hasAssets && assetData && (assetData.name || assetData.identifier || assetData.manufacturer)) {
      // Generate name if not provided
      const assetName = assetData.name ||
        `${assetData.manufacturer || ''} ${assetData.model || ''}`.trim() ||
        sectorConfig.terminology.asset.singular;

      asset = await tx.asset.create({
        data: {
          organization: { connect: { id: organizationId } },
          client: { connect: { id: client.id } },
          name: assetName,
          identifier: assetData.identifier,
          type: assetType,
          manufacturer: assetData.manufacturer,
          model: assetData.model,
          year: assetData.year ? parseInt(assetData.year, 10) : null,
          metadata: assetData.metadata || {},
        },
      });
    }

    // Create appointment
    const scheduledStart = new Date(appointmentData.scheduledStart);
    const scheduledEnd = new Date(scheduledStart);
    scheduledEnd.setMinutes(scheduledEnd.getMinutes() + (appointmentData.duration || 60));

    const appointment = await tx.appointment.create({
      data: {
        organization: { connect: { id: organizationId } },
        client: { connect: { id: client.id } },
        createdBy: { connect: { id: systemUser.id } },
        ...(asset && { asset: { connect: { id: asset.id } } }),
        ...(locationId && { locationRef: { connect: { id: locationId } } }),
        title: appointmentData.title || 'Programare noua',
        description: appointmentData.description || null,
        scheduledStart,
        scheduledEnd,
        status: 'PENDING',
        location: appointmentData.location || null,
      },
    });

    // Create client account if requested
    let clientAccount = null;
    if (createAccount && password) {
      // Check if this client already has an account
      const existingAccountForClient = await tx.clientAccount.findFirst({
        where: { clientId: client.id },
      });

      // Check if email is already used by an account in a DIFFERENT organization
      const existingAccountWithEmail = await tx.clientAccount.findFirst({
        where: {
          email: clientData.email.toLowerCase(),
        },
        include: {
          client: {
            select: { organizationId: true },
          },
        },
      });

      if (existingAccountForClient) {
        // Client already has an account, use it
        clientAccount = existingAccountForClient;
      } else if (existingAccountWithEmail) {
        // Email exists but for a different organization's client
        if (existingAccountWithEmail.client.organizationId !== organizationId) {
          // Different org - generate a unique email variant
          const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
          const verificationToken = crypto.randomBytes(32).toString('hex');
          const uniqueEmail = `${clientData.email.toLowerCase().split('@')[0]}+${organizationId.slice(-6)}@${clientData.email.split('@')[1]}`;

          clientAccount = await tx.clientAccount.create({
            data: {
              client: { connect: { id: client.id } },
              email: uniqueEmail,
              password: hashedPassword,
              verificationToken,
              isVerified: false,
            },
          });
        }
      } else {
        // No existing account, create new one
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const verificationToken = crypto.randomBytes(32).toString('hex');

        clientAccount = await tx.clientAccount.create({
          data: {
            client: { connect: { id: client.id } },
            email: clientData.email.toLowerCase(),
            password: hashedPassword,
            verificationToken,
            isVerified: false,
          },
        });
      }
    }

    return {
      client,
      asset,
      appointment,
      clientAccount,
    };
  });

  // Emit real-time event to organization for new public booking
  emitToOrganization(organizationId, 'appointment:public-booking', {
    appointment: {
      id: result.appointment.id,
      title: result.appointment.title,
      scheduledStart: result.appointment.scheduledStart,
      scheduledEnd: result.appointment.scheduledEnd,
      status: result.appointment.status,
    },
    client: {
      id: result.client.id,
      firstName: result.client.firstName,
      lastName: result.client.lastName,
      email: result.client.email,
      phone: result.client.phone,
    },
    asset: result.asset ? {
      id: result.asset.id,
      name: result.asset.name,
      identifier: result.asset.identifier,
    } : null,
  });

  return {
    success: true,
    appointment: {
      id: result.appointment.id,
      title: result.appointment.title,
      scheduledStart: result.appointment.scheduledStart,
      scheduledEnd: result.appointment.scheduledEnd,
      status: result.appointment.status,
    },
    client: {
      id: result.client.id,
      firstName: result.client.firstName,
      lastName: result.client.lastName,
      email: result.client.email,
    },
    asset: result.asset ? {
      id: result.asset.id,
      name: result.asset.name,
      identifier: result.asset.identifier,
    } : null,
    accountCreated: !!result.clientAccount,
  };
};

/**
 * Get available dates for the next N days
 */
const getAvailableDates = async (prisma, { organizationId, days = 30, settings = null }) => {
  const dates = [];
  const now = new Date();

  // Start from today at midnight local time
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Use organization settings if provided
  const allowWeekends = settings?.allowWeekends ?? false;

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    // Skip weekends unless allowed
    const dayOfWeek = date.getDay();
    if (!allowWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      continue;
    }

    // Format date as YYYY-MM-DD in local time
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    dates.push({
      date: `${year}-${month}-${day}`,
      dayOfWeek: date.toLocaleDateString('ro-RO', { weekday: 'long' }),
      formatted: date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' }),
    });
  }

  return dates;
};

module.exports = {
  getOrganizationBySlug,
  getAvailableSlots,
  createPublicBooking,
  getAvailableDates,
};
