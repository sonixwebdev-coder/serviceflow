const { AppError } = require('../utils/errors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { emitToOrganization } = require('../realtime/emitter');
const { getSectorConfig } = require('../constants/activitySectors');
const { sendAppointmentReminder } = require('./email/emailService');
const { getCompanySettings } = require('./companySettingService');
const { createNotification } = require('./notificationService');
const { sendPushToUser } = require('./pushNotificationService');
const {
  getAvailableDates,
  getAvailableSlots,
  getOrganizationBySlug,
} = require('./publicBooking/publicBookingAvailability');
const logger = require('../utils/logger');

const SALT_ROUNDS = 10;

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
 * Create a public booking (appointment + client + asset if applicable)
 */
const createPublicBooking = async (
  prisma,
  { organizationId, clientData, appointmentData, assetData, createAccount, password, locationId }
) => {
  // Get organization to determine if assets are needed
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { activitySector: true },
  });

  const sectorConfig = getSectorConfig(organization.activitySector);
  const hasAssets = sectorConfig?.hasAssets ?? false;
  const assetType = sectorConfig?.assetType || null;

  // Quota check: appointments (monthly)
  const { checkOrganizationLimits } = require('./organizationService');
  await checkOrganizationLimits(organizationId, 'appointments');

  // Get a system user for createdById (required field)
  const systemUser = await getSystemUserForOrg(prisma, organizationId);

  // Check if client with this email already exists for this organization
  let client = await prisma.client.findFirst({
    where: {
      organizationId,
      email: clientData.email.toLowerCase(),
    },
  });

  // Pre-compute bcrypt hash outside the transaction to avoid timeout (bcrypt is CPU-intensive)
  let preHashedPassword = null;
  let preVerificationToken = null;
  if (createAccount && password) {
    preHashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    preVerificationToken = crypto.randomBytes(32).toString('hex');
  }

  // Start a transaction
  const result = await prisma.$transaction(
    async (tx) => {
      // Create or update client
      if (!client) {
        // Quota check: clients (new client in public booking)
        await checkOrganizationLimits(organizationId, 'clients');
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
      if (
        hasAssets &&
        assetData &&
        (assetData.name || assetData.identifier || assetData.manufacturer)
      ) {
        // Generate name if not provided
        const assetName =
          assetData.name ||
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
            const uniqueEmail = `${clientData.email.toLowerCase().split('@')[0]}+${organizationId.slice(-6)}@${clientData.email.split('@')[1]}`;

            clientAccount = await tx.clientAccount.create({
              data: {
                client: { connect: { id: client.id } },
                email: uniqueEmail,
                password: preHashedPassword,
                verificationToken: preVerificationToken,
                isVerified: false,
              },
            });
          }
        } else {
          // No existing account, create new one
          clientAccount = await tx.clientAccount.create({
            data: {
              client: { connect: { id: client.id } },
              email: clientData.email.toLowerCase(),
              password: preHashedPassword,
              verificationToken: preVerificationToken,
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
    },
    { timeout: 30000 }
  );

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
    asset: result.asset
      ? {
          id: result.asset.id,
          name: result.asset.name,
          identifier: result.asset.identifier,
        }
      : null,
  });

  // Send booking confirmation email to client (fire-and-forget)
  if (result.client?.email) {
    getCompanySettings(organizationId)
      .then((companySettings) => {
        sendAppointmentReminder(prisma, {
          appointment: result.appointment,
          client: result.client,
          companySettings,
          organizationId,
        }).catch((err) => logger.error('[EMAIL] Public booking confirmation failed:', err.message));
      })
      .catch(() => {});
  }

  // Notify admin users about new website booking (bell + push, fire-and-forget)
  const clientName = result.client
    ? `${result.client.firstName || ''} ${result.client.lastName || ''}`.trim() || 'Client'
    : 'Client';
  const dateStr = new Date(result.appointment.scheduledStart).toLocaleDateString('ro-RO');
  const timeStr = new Date(result.appointment.scheduledStart).toLocaleTimeString('ro-RO', {
    hour: '2-digit',
    minute: '2-digit',
  });

  prisma.user
    .findMany({
      where: {
        organizationId,
        isActive: true,
        roles: { some: { role: { key: 'admin' } } },
      },
      select: { id: true },
    })
    .then((adminUsers) => {
      const promises = adminUsers.map(async (admin) => {
        try {
          await createNotification({
            recipientId: admin.id,
            title: 'Programare noua de pe site',
            message: `${clientName} a creat o programare: ${result.appointment.title} - ${dateStr} ${timeStr}`,
            type: 'APPOINTMENT',
            entityType: 'APPOINTMENT',
            entityId: result.appointment.id,
            metadata: {
              appointmentId: result.appointment.id,
              clientId: result.client.id,
              clientName,
              scheduledStart: result.appointment.scheduledStart,
              createdFromWebsite: true,
            },
            organizationId,
          });

          await sendPushToUser(admin.id, {
            title: 'Programare noua de pe site',
            body: `${clientName}: ${result.appointment.title} - ${dateStr} ${timeStr}`,
            icon: '/icons/calendar.png',
            badge: '/icons/badge.png',
            data: {
              type: 'appointment',
              appointmentId: result.appointment.id,
              url: `/appointments?id=${result.appointment.id}`,
            },
          });
        } catch (err) {
          logger.warn(`Notificarea catre adminul ${admin.id} a esuat`, { error: err.message });
        }
      });
      Promise.all(promises).catch(() => {});
    })
    .catch((err) =>
      logger.warn('Nu s-au putut trimite notificarile pentru programarea de pe site', {
        error: err.message,
      })
    );

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
    asset: result.asset
      ? {
          id: result.asset.id,
          name: result.asset.name,
          identifier: result.asset.identifier,
        }
      : null,
    accountCreated: !!result.clientAccount,
  };
};

module.exports = {
  getOrganizationBySlug,
  getAvailableSlots,
  createPublicBooking,
  getAvailableDates,
};
