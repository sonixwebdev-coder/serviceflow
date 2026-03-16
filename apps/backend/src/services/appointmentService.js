const { AppError } = require('../utils/errors');
const { broadcastAppointment, broadcastServiceOrder, broadcastAppointmentToClient } = require('../realtime/events');
const { getCompanySettings } = require('./companySettingService');
const { upsertServiceOrder, generateServiceOrderPdf } = require('./serviceOrderService');
const { createNotification } = require('./notificationService');
const { sendAppointmentNotification } = require('./pushNotificationService');
const { optimizedAppointmentIncludes, minimalAppointmentIncludes } = require('../utils/optimizedIncludes');
const { getPrismaPagination, createPaginatedResponse, parsePaginationParams } = require('../utils/pagination');
const { createPayment } = require('./paymentService');
const { resolveAsset } = require('./assetService');
const logger = require('../utils/logger');
const googleCalendarService = require('./google/googleCalendarService');
const {
  sendAppointmentReminder,
  sendAppointmentCancelledEmail,
  sendAppointmentRescheduledEmail,
} = require('./email/emailService');

const STATUS_MAP = new Map([
  ['pending', 'PENDING'],
  ['approved', 'PREZENTAT'],
  ['prezentat', 'PREZENTAT'],
  ['in-progress', 'IN_PROGRESS'],
  ['in_progress', 'IN_PROGRESS'],
  ['completed', 'COMPLETED'],
  ['cancelled', 'CANCELLED'],
]);

const normalizeKey = (value) => (typeof value === 'string' ? value.toLowerCase().replace(/\s+/g, '-') : '');
const ADMIN_ROLE = 'admin';
const TECHNICIAN_ROLE = 'technician';

const mapStatus = (value) => {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  return STATUS_MAP.get(normalized) || STATUS_MAP.get(normalized.replace('_', '-')) || value.toUpperCase();
};

const TX_OPTIONS = {
  timeout: Number(process.env.PRISMA_TX_TIMEOUT || 30000), // Increased to 30 seconds for PDF generation
  maxWait: Number(process.env.PRISMA_TX_MAX_WAIT || 10000),
};

const includeConfig = {
  ...optimizedAppointmentIncludes,
  serviceOrder: {
    include: {
      lineItems: true,
    },
  },
};

const normalizeClientType = (value, fallback = 'PF') => {
  const input = (value || fallback || 'PF').toString().toUpperCase();
  return input === 'SRL' ? 'SRL' : 'PF';
};

const assignIfProvided = (target, source, key, transform) => {
  if (!source || !Object.prototype.hasOwnProperty.call(source, key)) return;
  const value = source[key];
  if (value === undefined) return;
  if (value === null || value === '') {
    target[key] = null;
    return;
  }
  target[key] = transform ? transform(value) : value;
};

const assignNumberIfProvided = (target, source, key, transform = Number) => {
  if (!source || !Object.prototype.hasOwnProperty.call(source, key)) return;
  const value = source[key];
  if (value === undefined) return;
  if (value === null || value === '') {
    target[key] = null;
    return;
  }
  const next = transform(value);
  if (Number.isFinite(next)) {
    target[key] = next;
  }
};

const collectRoleKeys = (source) => {
  const keys = new Set();
  if (!source) return keys;

  const addKey = (value) => {
    const key = normalizeKey(value);
    if (key) {
      keys.add(key);
    }
  };

  if (typeof source === 'string') {
    addKey(source);
    return keys;
  }

  if (Array.isArray(source)) {
    source.forEach((entry) => {
      if (!entry) return;
      if (typeof entry === 'string') {
        addKey(entry);
      } else if (typeof entry === 'object') {
        addKey(entry?.role?.key || entry?.key || entry?.role);
      }
    });
    return keys;
  }

  if (typeof source === 'object') {
    addKey(source?.role?.key || source?.key || source.role);
  }

  return keys;
};

const currentUserHasRole = (user, roleKey) => {
  const normalized = normalizeKey(roleKey);
  if (!normalized || !user) return false;

  const keys = new Set();
  collectRoleKeys(user.role).forEach((key) => keys.add(key));
  collectRoleKeys(user.roles).forEach((key) => keys.add(key));

  return keys.has(normalized);
};

const userHasRoleKey = (user, roleKey) => {
  const normalized = normalizeKey(roleKey);
  if (!normalized || !user) return false;

  const keys = new Set();
  collectRoleKeys(user.roles).forEach((key) => keys.add(key));
  collectRoleKeys(user.role).forEach((key) => keys.add(key));

  return keys.has(normalized);
};

const ensureAssigneePermissions = async (tx, assigneeIds = [], currentUser) => {
  if (!assigneeIds?.length || currentUserHasRole(currentUser, ADMIN_ROLE)) {
    return;
  }

  const users = await tx.user.findMany({
    where: { id: { in: assigneeIds } },
    select: {
      id: true,
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (users.length !== assigneeIds.length) {
    throw new AppError('Unul sau mai multi tehnicieni selectati nu au fost gasiti. Va rugam verificati selectia.', 404);
  }

  const invalid = users.filter((user) => !userHasRoleKey(user, TECHNICIAN_ROLE));
  if (invalid.length) {
    throw new AppError('Doar tehnicienii pot fi asignati la programari. Va rugam selectati doar utilizatori cu rol de tehnician.', 403);
  }
};

const ensureRampAvailability = async (tx, scheduledStart, scheduledEnd, excludeAppointmentId, organizationId) => {
  const settings = await getCompanySettings(organizationId);
  const rampCount = Number(settings.rampCount) || 0;
  if (!rampCount) return;

  const overlapping = await tx.appointment.count({
    where: {
      id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
      status: { not: 'CANCELLED' },
      scheduledStart: { lt: scheduledEnd },
      scheduledEnd: { gt: scheduledStart },
    },
  });

  if (overlapping >= rampCount) {
    throw new AppError('Nu exista rampe disponibile in intervalul orar selectat. Va rugam alegeti alt interval sau anulati o alta programare.', 409);
  }
};

const resolveClient = async (tx, clientPayload, fallbackId, organizationId) => {
  if (!clientPayload && !fallbackId) return null;

  let client = null;

  if (fallbackId) {
    const where = organizationId ? { id: fallbackId, organizationId } : { id: fallbackId };
    client = await tx.client.findFirst({ where });
    if (!client) {
      throw new AppError('Clientul nu a fost gasit. Va rugam selectati un client valid sau creati unul nou.', 404);
    }
  }

  if (clientPayload?.id && (!client || client.id !== clientPayload.id)) {
    const where = organizationId ? { id: clientPayload.id, organizationId } : { id: clientPayload.id };
    client = await tx.client.findFirst({ where });
    if (!client) {
      throw new AppError('Clientul specificat nu a fost gasit. Va rugam verificati datele clientului.', 404);
    }
  }

  const type = normalizeClientType(clientPayload?.type, client?.type || (clientPayload?.companyName ? 'SRL' : 'PF'));

  if (!client && clientPayload) {
    if (type === 'SRL') {
      if (clientPayload.vatNumber) {
        const where = organizationId
          ? { vatNumber: clientPayload.vatNumber, organizationId }
          : { vatNumber: clientPayload.vatNumber };
        client = await tx.client.findFirst({ where });
      }
      if (!client && clientPayload.registrationNumber) {
        const where = organizationId
          ? { registrationNumber: clientPayload.registrationNumber, organizationId }
          : { registrationNumber: clientPayload.registrationNumber };
        client = await tx.client.findFirst({ where });
      }
    } else {
      if (clientPayload.email) {
        const where = organizationId
          ? { email: clientPayload.email, organizationId }
          : { email: clientPayload.email };
        client = await tx.client.findFirst({ where });
      }
      if (!client && clientPayload.phone) {
        const where = organizationId
          ? { phone: clientPayload.phone, organizationId }
          : { phone: clientPayload.phone };
        client = await tx.client.findFirst({ where });
      }
    }
  }

  if (!client && !clientPayload) {
    return null;
  }

  const data = { type };
  const fields = ['firstName', 'lastName', 'companyName', 'contactName', 'phone', 'email', 'vatNumber', 'registrationNumber', 'notes'];
  fields.forEach((field) => assignIfProvided(data, clientPayload, field));

  if (client) {
    if (Object.keys(data).length > 0) {
      client = await tx.client.update({ where: { id: client.id }, data });
    }
    return client;
  }

  if (type === 'SRL' && !data.companyName) {
    throw new AppError('Pentru clientii de tip Firma (SRL) este obligatoriu sa specificati numele companiei.', 400);
  }

  if (type === 'PF' && !data.firstName) {
    throw new AppError('Pentru clientii de tip Persoana Fizica (PF) este obligatoriu sa specificati numele.', 400);
  }

  if (!data.phone) {
    throw new AppError('Numarul de telefon al clientului este obligatoriu.', 400);
  }

  if (organizationId) {
    data.organizationId = organizationId;
    // Quota check: clients (new client creation inside appointment)
    const { checkOrganizationLimits: checkLimits } = require('./organizationService');
    await checkLimits(organizationId, 'clients');
  }

  return tx.client.create({ data });
};

// resolveVehicle removed - now using Asset model via resolveAsset from assetService.js

/**
 * Sync appointment to Google Calendar for all relevant users
 * Runs asynchronously and doesn't block the main operation
 * @param {object} prisma - Prisma client
 * @param {object} appointment - The appointment with client data
 * @param {'create' | 'update' | 'delete'} action - The sync action
 */
const syncToGoogleCalendar = async (prisma, appointment, action = 'create') => {
  try {
    // Collect all user IDs who should have this synced
    const userIds = new Set();

    // Add the creator
    if (appointment.createdById) {
      userIds.add(appointment.createdById);
    }

    // Add all assignees
    if (appointment.assignees?.length) {
      appointment.assignees.forEach((a) => {
        if (a.userId) userIds.add(a.userId);
      });
    }

    if (userIds.size === 0) {
      logger.debug('[GCAL] No users to sync appointment to', { appointmentId: appointment.id });
      return;
    }

    logger.info(`[GCAL] Syncing appointment ${appointment.id} to ${userIds.size} user(s)`, {
      action,
      userIds: Array.from(userIds),
    });

    // Sync to each user's calendar in parallel (fire and forget)
    const syncPromises = Array.from(userIds).map(async (userId) => {
      try {
        if (action === 'create') {
          await googleCalendarService.createEvent(prisma, userId, appointment, appointment.client);
        } else if (action === 'update') {
          await googleCalendarService.updateEvent(prisma, userId, appointment, appointment.client);
        } else if (action === 'delete') {
          await googleCalendarService.deleteEvent(prisma, userId, appointment.id);
        }
        logger.debug(`[GCAL] Sync ${action} successful for user ${userId}`, { appointmentId: appointment.id });
      } catch (err) {
        logger.error(`[GCAL] Sync ${action} failed for user ${userId}:`, {
          appointmentId: appointment.id,
          error: err.message,
        });
        // Don't throw - we want to continue syncing for other users
      }
    });

    // Wait for all syncs but don't block on errors
    await Promise.allSettled(syncPromises);
  } catch (error) {
    logger.error('[GCAL] Failed to sync appointment to Google Calendar:', {
      appointmentId: appointment.id,
      action,
      error: error.message,
    });
    // Don't throw - calendar sync should not fail the main operation
  }
};

const listAppointments = async (prisma, filters = {}, options = {}) => {
  const { status, from, to, clientId, assigneeId, locationId, fields } = filters;
  const where = {};

  if (status) {
    where.status = mapStatus(status);
  }

  if (from || to) {
    where.scheduledStart = {};
    if (from) {
      where.scheduledStart.gte = new Date(from);
    }
    if (to) {
      where.scheduledStart.lte = new Date(to);
    }
  }

  if (clientId) {
    where.clientId = clientId;
  }

  if (assigneeId) {
    where.assignees = {
      some: {
        userId: assigneeId,
      },
    };
  }

  // Filter by location
  if (locationId) {
    where.locationId = locationId;
  } else if (options.locationFilter) {
    Object.assign(where, options.locationFilter);
  }

  const orderBy = { scheduledStart: 'desc' };

  // Support pagination (optional for backward compatibility)
  if (options.paginate) {
    const pagination = parsePaginationParams(filters);

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: minimalAppointmentIncludes, // Use lighter includes for lists
        orderBy,
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.appointment.count({ where }),
    ]);

    return createPaginatedResponse(appointments, total, pagination);
  }

  // Backward compatible: return all appointments (but with safety limit)
  const useMinimal = options.minimal || fields === 'calendar';
  const appointments = await prisma.appointment.findMany({
    where,
    include: useMinimal ? minimalAppointmentIncludes : includeConfig,
    orderBy,
    take: useMinimal ? 500 : 100, // Calendar views allow more, detail list capped
  });

  return appointments;
};

const createAppointment = async (prisma, payload, currentUser, options = {}) => {
  const { locationId: defaultLocationId } = options;
  const scheduledStart = new Date(payload.scheduledStart);
  const scheduledEnd = new Date(payload.scheduledEnd);

  if (!(scheduledStart instanceof Date && !Number.isNaN(scheduledStart.valueOf()))) {
    throw new AppError('Data si ora de inceput sunt invalide. Va rugam selectati o data si ora valide.', 400);
  }
  if (!(scheduledEnd instanceof Date && !Number.isNaN(scheduledEnd.valueOf()))) {
    throw new AppError('Data si ora de sfarsit sunt invalide. Va rugam selectati o data si ora valide.', 400);
  }
  if (scheduledEnd <= scheduledStart) {
    throw new AppError('Data si ora de sfarsit trebuie sa fie dupa data si ora de inceput.', 400);
  }

  // Quota check: appointments (monthly)
  const { checkOrganizationLimits } = require('./organizationService');
  await checkOrganizationLimits(currentUser.organizationId, 'appointments');

  let appointment = null;
  let serviceOrderEvent = null;

  await prisma.$transaction(async (tx) => {
    await ensureAssigneePermissions(tx, payload.assigneeIds, currentUser);
    await ensureRampAvailability(tx, scheduledStart, scheduledEnd, null, currentUser.organizationId);

    const client = await resolveClient(tx, payload.client, payload.clientId, currentUser.organizationId);
    logger.info('✅ Client resolved', { clientId: client?.id });

    // Resolve asset from payload
    const asset = await resolveAsset(
      tx,
      client?.id || payload.clientId || null,
      payload.asset,
      payload.assetId,
      currentUser.organizationId
    );
    logger.info('✅ Asset resolved', { assetId: asset?.id, assetName: asset?.name });

    const data = {
      title: payload.title,
      description: payload.description,
      status: mapStatus(payload.status) || 'PENDING',
      scheduledStart,
      scheduledEnd,
      location: payload.location,
      locationId: payload.locationId || defaultLocationId || null,
      clientId: client?.id || null,
      assetId: asset?.id || null, // Use Asset instead of Vehicle
      createdById: currentUser.id,
      updatedById: currentUser.id,
      metadata: payload.metadata,
      assignees: payload.assigneeIds?.length
        ? {
            create: payload.assigneeIds.map((userId) => ({ userId })),
          }
        : undefined,
    };

    // Handle initial advance payment if provided
    if (payload.advancePayment && payload.advancePayment > 0) {
      data.advancePayment = roundCurrency(Number(payload.advancePayment));
      data.advancePaidAt = new Date();
      // Payment status and remaining balance will be calculated after service order is created
    }

    try {
      appointment = await tx.appointment.create({
        data,
        include: includeConfig,
      });

      logger.info('✅ Appointment created', { appointmentId: appointment.id, hasServiceOrder: !!payload.serviceOrder });
    } catch (error) {
      if (error.code === 'P2003') {
        throw new AppError('Related entity not found', 400);
      }
      throw error;
    }

    if (payload.serviceOrder) {
      logger.info('📝 Creating service order for appointment', { appointmentId: appointment.id });
      try {
        await upsertServiceOrder(tx, appointment.id, payload.serviceOrder, {
          skipBroadcast: true,
          organizationId: currentUser.organizationId,
          onResult: (order, action) => {
            serviceOrderEvent = { order, action };
          },
        });
        logger.info('✅ Service order created successfully');
      } catch (error) {
        logger.error('❌ Service order creation failed:', {
          error: error.message,
          stack: error.stack,
          appointmentId: appointment.id
        });
        throw error;
      }

      appointment = await tx.appointment.findFirst({
        where: { id: appointment.id, organizationId: currentUser.organizationId },
        include: includeConfig,
      });

      // Calculate payment status if advance payment was provided
      if (payload.advancePayment && payload.advancePayment > 0 && appointment?.serviceOrder) {
        const total = calculateAppointmentTotal(appointment);
        const advancePayment = roundCurrency(Number(payload.advancePayment));

        if (total > 0) {
          const remainingBalance = roundCurrency(total - advancePayment);
          const paymentStatus = remainingBalance <= 0 ? 'PAID' : 'PARTIAL';

          appointment = await tx.appointment.update({
            where: { id: appointment.id },
            data: {
              remainingBalance: remainingBalance,
              paymentStatus: paymentStatus,
              finalPaidAt: paymentStatus === 'PAID' ? new Date() : null,
            },
            include: includeConfig,
          });

          // Create Payment record for the advance payment
          await tx.payment.create({
            data: {
              appointmentId: appointment.id,
              amount: advancePayment,
              paymentMethod: 'CASH', // Default to cash for initial advance payments
              paymentDate: new Date(),
              notes: 'Avans initial la creare programare',
              createdById: currentUser.id,
            },
          });
        }
      }
    }
  }, TX_OPTIONS);

  if (!appointment) {
    throw new AppError('Failed to create appointment', 500);
  }

  if (!appointment.serviceOrder && payload.serviceOrder) {
    appointment = await getAppointmentById(appointment.id);
  }

  if (serviceOrderEvent) {
    broadcastServiceOrder(serviceOrderEvent.action, serviceOrderEvent.order);
  }

  logger.info('📢 Broadcasting appointment created event', { appointmentId: appointment.id });
  broadcastAppointment('created', appointment);

  // Create notifications for assignees and admins
  logger.notification('🔔 Starting notification creation process', { appointmentId: appointment.id });
  try {
    logger.debug('🔍 Querying for admin users...');
    const adminUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        roles: {
          some: {
            role: { key: 'admin' },
          },
        },
      },
      select: { id: true },
    });

    logger.notification(`Found ${adminUsers.length} admin users for notifications`, { adminUserIds: adminUsers.map(u => u.id) });

    const notificationRecipients = new Set();

    // Add assignees
    if (appointment.assignees?.length) {
      appointment.assignees.forEach((a) => {
        if (a.userId) notificationRecipients.add(a.userId);
      });
    }

    // Add all admins
    adminUsers.forEach((admin) => notificationRecipients.add(admin.id));

    logger.notification(`Total notification recipients: ${notificationRecipients.size}`, {
      recipients: Array.from(notificationRecipients),
      appointmentId: appointment.id
    });

    // Create notifications for all recipients
    const appointmentTime = new Date(appointment.scheduledStart).toLocaleString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const notificationResults = await Promise.all(
      Array.from(notificationRecipients).map((recipientId) =>
        createNotification({
          recipientId,
          title: 'Programare noua',
          message: `${appointment.title} - ${appointmentTime}`,
          type: 'APPOINTMENT',
          entityType: 'APPOINTMENT',
          entityId: appointment.id,
          organizationId: appointment.organizationId,
          metadata: {
            appointmentId: appointment.id,
            scheduledStart: appointment.scheduledStart,
            scheduledEnd: appointment.scheduledEnd,
          },
        }).then((notification) => {
          logger.notification(`✓ Notification created for user ${recipientId}`, { notificationId: notification?.id });
          return notification;
        }).catch((err) => {
          logger.error(`✗ Failed to create notification for user ${recipientId}`, { error: err.message });
          return null;
        })
      )
    );

    const successCount = notificationResults.filter(Boolean).length;
    logger.notification(`Created ${successCount} notifications successfully`, {
      total: notificationResults.length,
      successful: successCount,
      failed: notificationResults.length - successCount,
      appointmentId: appointment.id
    });

    // Send push notifications
    try {
      await sendAppointmentNotification(appointment, 'created');
      logger.notification('Push notifications sent for appointment creation', { appointmentId: appointment.id });
    } catch (pushError) {
      logger.error('Failed to send push notifications for appointment', { error: pushError.message, appointmentId: appointment.id });
      // Don't fail if push notifications fail
    }
  } catch (notifError) {
    logger.error('Failed to send appointment notifications', { error: notifError.message, appointmentId: appointment.id });
    // Don't fail the whole operation if notifications fail
  }

  // Sync to Google Calendar (fire and forget, doesn't block the response)
  syncToGoogleCalendar(prisma, appointment, 'create').catch((err) => {
    logger.error('[GCAL] Background sync failed:', { appointmentId: appointment.id, error: err.message });
  });

  // Send appointment confirmation email to client (fire-and-forget)
  if (appointment.client?.email) {
    getCompanySettings(appointment.organizationId).then((companySettings) => {
      sendAppointmentReminder(prisma, {
        appointment,
        client: appointment.client,
        companySettings,
        organizationId: appointment.organizationId,
      }).catch((err) => logger.error('[EMAIL] Appointment confirmation failed:', err.message));
    }).catch(() => {});
  }

  return appointment;
};

const getAppointmentById = async (prisma, appointmentId) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: includeConfig,
  });

  if (!appointment) {
    throw new AppError('Programarea nu a fost gasita. Verificati ID-ul programarii.', 404);
  }

  return appointment;
};

const updateAppointment = async (prisma, appointmentId, payload, currentUser) => {
  const existing = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!existing) {
    throw new AppError('Programarea nu a fost gasita. Verificati ID-ul programarii.', 404);
  }

  // Prevent editing completed appointments
  if (existing.status === 'COMPLETED') {
    throw new AppError('Nu se pot edita programarile completate. Programarea este deja finalizata.', 400);
  }

  const scheduledStart = payload.scheduledStart ? new Date(payload.scheduledStart) : existing.scheduledStart;
  const scheduledEnd = payload.scheduledEnd ? new Date(payload.scheduledEnd) : existing.scheduledEnd;

  if (!(scheduledStart instanceof Date && !Number.isNaN(scheduledStart.valueOf()))) {
    throw new AppError('Data si ora de inceput sunt invalide. Va rugam selectati o data si ora valide.', 400);
  }
  if (!(scheduledEnd instanceof Date && !Number.isNaN(scheduledEnd.valueOf()))) {
    throw new AppError('Data si ora de sfarsit sunt invalide. Va rugam selectati o data si ora valide.', 400);
  }
  if (scheduledEnd <= scheduledStart) {
    throw new AppError('Data si ora de sfarsit trebuie sa fie dupa data si ora de inceput.', 400);
  }

  let updated = null;
  let serviceOrderEvent = null;

  await prisma.$transaction(async (tx) => {
    if (payload.assigneeIds) {
      await ensureAssigneePermissions(tx, payload.assigneeIds, currentUser);
    }
    await ensureRampAvailability(tx, scheduledStart, scheduledEnd, appointmentId, currentUser.organizationId);

    const client = await resolveClient(tx, payload.client, payload.clientId ?? existing.clientId, currentUser.organizationId);
    const asset = await resolveAsset(
      tx,
      client?.id || payload.clientId || existing.clientId,
      payload.asset,
      payload.assetId ?? existing.assetId,
      currentUser.organizationId
    );

    const data = {
      title: payload.title ?? existing.title,
      description: payload.description ?? existing.description,
      status: mapStatus(payload.status) || existing.status,
      scheduledStart,
      scheduledEnd,
      location: payload.location ?? existing.location,
      clientId: client?.id ?? existing.clientId,
      assetId: asset?.id ?? existing.assetId,
      metadata: payload.metadata ?? existing.metadata,
      updatedById: currentUser.id,
      cancellationReason: payload.cancellationReason ?? existing.cancellationReason,
    };

    updated = await tx.appointment.update({
      where: { id: appointmentId },
      data: {
        ...data,
        assignees: payload.assigneeIds
          ? {
              deleteMany: {},
              create: payload.assigneeIds.map((userId) => ({ userId })),
            }
          : undefined,
      },
      include: includeConfig,
    });

    if (payload.serviceOrder) {
      try {
        await upsertServiceOrder(tx, appointmentId, payload.serviceOrder, {
          skipBroadcast: true,
          organizationId: currentUser.organizationId,
          onResult: (order, action) => {
            serviceOrderEvent = { order, action };
          },
        });
        logger.info('✅ Service order updated successfully');
      } catch (error) {
        logger.error('❌ Service order update failed:', {
          error: error.message,
          stack: error.stack,
          appointmentId: appointmentId
        });
        throw error;
      }

      updated = await tx.appointment.findFirst({
        where: { id: appointmentId, organizationId: currentUser.organizationId },
        include: includeConfig,
      });
    }
  }, TX_OPTIONS);

  if (!updated?.serviceOrder && payload.serviceOrder) {
    updated = await getAppointmentById(appointmentId);
  }

  if (serviceOrderEvent) {
    broadcastServiceOrder(serviceOrderEvent.action, serviceOrderEvent.order);
  }

  // Regenerate service order PDF if appointment has a service order and relevant fields changed
  if (updated?.serviceOrder) {
    const relevantFieldsChanged =
      payload.client ||
      payload.clientId ||
      payload.asset ||
      payload.assetId ||
      payload.title ||
      payload.scheduledStart ||
      payload.scheduledEnd;

    if (relevantFieldsChanged) {
      try {
        await generateServiceOrderPdf(appointmentId, { refresh: true });
        logger.info('[APPOINTMENT] Service order PDF regenerated after appointment update', { appointmentId });
      } catch (pdfError) {
        logger.error('[APPOINTMENT] Failed to regenerate service order PDF:', pdfError);
        // Don't fail the whole operation if PDF regeneration fails
      }
    }
  }

  broadcastAppointment('updated', updated);

  // Broadcast to client portal
  broadcastAppointmentToClient('updated', updated);

  // Send notification when appointment status changes
  try {
    const statusChanged = existing.status !== updated.status;
    if (statusChanged) {
      const appointmentTime = new Date(updated.scheduledStart).toLocaleString('ro-RO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

      const statusMessages = {
        PENDING: 'Comanda de service in asteptare',
        APPROVED: 'Comanda de service aprobata',
        IN_PROGRESS: 'Comanda de service in lucru',
        COMPLETED: 'Comanda de service finalizata',
        CANCELLED: 'Comanda de service anulata',
      };

      const title = statusMessages[updated.status] || 'Actualizare comanda service';
      const recipientIds = new Set();

      // Add all assignees
      updated.assignees?.forEach((assignee) => {
        recipientIds.add(assignee.userId);
      });

      // Add admins for all status changes
      const adminUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          roles: {
            some: {
              role: { key: 'admin' },
            },
          },
        },
        select: { id: true },
      });

      adminUsers.forEach((admin) => recipientIds.add(admin.id));

      await Promise.all(
        Array.from(recipientIds).map((recipientId) =>
          createNotification({
            recipientId,
            title,
            message: `${updated.title} - ${appointmentTime}`,
            type: 'APPOINTMENT',
            entityType: 'APPOINTMENT',
            entityId: updated.id,
            organizationId: updated.organizationId,
            metadata: {
              appointmentId: updated.id,
              status: updated.status,
              previousStatus: existing.status,
              scheduledStart: updated.scheduledStart,
              scheduledEnd: updated.scheduledEnd,
            },
          }).catch((err) => logger.error('Failed to create status change notification:', err))
        )
      );

      logger.info('[APPOINTMENT] Status change notifications sent', {
        appointmentId: updated.id,
        oldStatus: existing.status,
        newStatus: updated.status,
        recipientCount: recipientIds.size,
      });

      // Send push notifications for status change
      try {
        await sendAppointmentNotification(updated, 'updated');
        logger.notification('Push notifications sent for appointment update', { appointmentId: updated.id });
      } catch (pushError) {
        logger.error('Failed to send push notifications for appointment update', { error: pushError.message, appointmentId: updated.id });
        // Don't fail if push notifications fail
      }
    }
  } catch (notifError) {
    logger.error('[APPOINTMENT] Failed to send status change notification:', notifError);
    // Don't fail the whole operation if notifications fail
  }

  // Record loyalty visit if status changed to COMPLETED
  if (updated.status === 'COMPLETED' && existing.status !== 'COMPLETED' && updated.clientId) {
    try {
      const loyaltyService = require('./loyaltyService');
      loyaltyService.recordCompletedVisit(prisma, {
        clientId: updated.clientId,
        appointmentId: updated.id,
      });
    } catch (err) {
      logger.error('[LOYALTY] Failed to record completed visit:', err.message);
    }
  }

  // Sync to Google Calendar (fire and forget, doesn't block the response)
  syncToGoogleCalendar(prisma, updated, 'update').catch((err) => {
    logger.error('[GCAL] Background sync failed:', { appointmentId: updated.id, error: err.message });
  });

  // Send reschedule email if date/time changed (fire-and-forget)
  const dateChanged = existing.scheduledStart.getTime() !== updated.scheduledStart.getTime()
    || existing.scheduledEnd.getTime() !== updated.scheduledEnd.getTime();
  if (dateChanged && updated.client?.email) {
    const oldDate = existing.scheduledStart.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });
    const oldTime = existing.scheduledStart.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
    getCompanySettings(updated.organizationId).then((companySettings) => {
      sendAppointmentRescheduledEmail(prisma, {
        appointment: updated,
        client: updated.client,
        oldDate,
        oldTime,
        companySettings,
        organizationId: updated.organizationId,
      }).catch((err) => logger.error('[EMAIL] Appointment reschedule email failed:', err.message));
    }).catch(() => {});
  }

  return updated;
};

const cancelAppointment = async (prisma, appointmentId, reason, currentUser) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    throw new AppError('Programarea nu a fost gasita. Verificati ID-ul programarii.', 404);
  }

  if (appointment.status === 'COMPLETED') {
    throw new AppError('Nu se pot anula programarile finalizate.', 400);
  }

  if (appointment.status === 'CANCELLED') {
    throw new AppError('Programarea este deja anulata.', 400);
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: 'CANCELLED',
      cancellationReason: reason || 'Cancelled',
      updatedById: currentUser.id,
    },
    include: includeConfig,
  });

  broadcastAppointment('cancelled', updated);

  // Broadcast to client portal
  broadcastAppointmentToClient('cancelled', updated);

  // Send in-app + push notifications for cancellation
  try {
    const recipientIds = updated.assignees?.map(a => a.userId || a.user?.id).filter(Boolean) || [];
    await Promise.all(recipientIds.map((recipientId) =>
      createNotification({
        recipientId,
        title: 'Programare anulata',
        message: `Programarea "${updated.title}" a fost anulata`,
        type: 'APPOINTMENT',
        entityType: 'APPOINTMENT',
        entityId: updated.id,
        organizationId: updated.organizationId,
      }).catch(() => {})
    ));
    await sendAppointmentNotification(updated, 'cancelled');
  } catch (pushError) {
    logger.error('Failed to send notifications for appointment cancellation', { error: pushError.message, appointmentId: updated.id });
  }

  // Delete from Google Calendar (fire and forget, doesn't block the response)
  syncToGoogleCalendar(prisma, updated, 'delete').catch((err) => {
    logger.error('[GCAL] Background delete failed:', { appointmentId: updated.id, error: err.message });
  });

  // Send cancellation email to client (fire-and-forget)
  if (updated.client?.email) {
    getCompanySettings(updated.organizationId).then((companySettings) => {
      sendAppointmentCancelledEmail(prisma, {
        appointment: updated,
        client: updated.client,
        cancellationReason: reason,
        companySettings,
        organizationId: updated.organizationId,
      }).catch((err) => logger.error('[EMAIL] Appointment cancellation email failed:', err.message));
    }).catch(() => {});
  }

  return updated;
};

const roundCurrency = (value) => {
  const num = Number(value);
  return Number(num.toFixed(2));
};

const calculateAppointmentTotal = (appointment) => {
  if (!appointment.serviceOrder?.lineItems?.length) {
    return 0;
  }

  const subtotal = appointment.serviceOrder.lineItems.reduce((sum, item) => {
    const itemTotal = Number(item.totalPrice || 0);
    return sum + itemTotal;
  }, 0);

  // Include service order tax (TVA) so total matches the invoiced amount
  return roundCurrency(subtotal + Number(appointment.serviceOrder.tax || 0));
};

const recordAdvancePayment = async (prisma, appointmentId, amount, userId) => {
  if (!amount || amount <= 0) {
    throw new AppError('Suma avansului trebuie sa fie mai mare decat 0.', 400);
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      serviceOrder: {
        include: {
          lineItems: true,
        },
      },
    },
  });

  if (!appointment) {
    throw new AppError('Programarea nu a fost gasita. Verificati ID-ul programarii.', 404);
  }

  if (appointment.paymentStatus === 'PAID') {
    throw new AppError('Programarea este deja platita in intregime.', 400);
  }

  const total = calculateAppointmentTotal(appointment);

  if (total === 0) {
    throw new AppError('Nu se poate inregistra plata pentru o programare fara articole in comanda de service.', 400);
  }

  // Create Payment record (which will automatically update appointment payment status)
  const payment = await createPayment({
    appointmentId,
    amount,
    paymentMethod: 'CASH',
    paymentDate: new Date(),
    notes: 'Avans plătit',
    createdById: userId,
  });

  // Get updated appointment with new payment status
  const updated = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: includeConfig,
  });

  // Regenerate service order PDF to reflect payment changes
  if (updated?.serviceOrder) {
    try {
      await generateServiceOrderPdf(appointmentId, { refresh: true });
      logger.info('[PAYMENT] Service order PDF regenerated after advance payment', { appointmentId });
    } catch (pdfError) {
      logger.error('[PAYMENT] Failed to regenerate service order PDF:', pdfError);
      // Don't fail the whole operation if PDF regeneration fails
    }
  }

  broadcastAppointment('updated', updated);

  return {
    appointment: updated,
    payment,
    paymentSummary: {
      total,
      advance: Number(updated.advancePayment || 0),
      remaining: Number(updated.remainingBalance || 0),
      status: updated.paymentStatus,
    },
  };
};

const recordFinalPayment = async (prisma, appointmentId, amount, userId) => {
  if (!amount || amount <= 0) {
    throw new AppError('Suma platii finale trebuie sa fie mai mare decat 0.', 400);
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      serviceOrder: {
        include: {
          lineItems: true,
        },
      },
    },
  });

  if (!appointment) {
    throw new AppError('Programarea nu a fost gasita. Verificati ID-ul programarii.', 404);
  }

  if (appointment.paymentStatus === 'PAID') {
    throw new AppError('Programarea este deja platita in intregime.', 400);
  }

  // Create Payment record for final payment (which will automatically update appointment)
  const payment = await createPayment({
    appointmentId,
    amount,
    paymentMethod: 'CASH',
    paymentDate: new Date(),
    notes: 'Plată finală',
    createdById: userId,
  });

  // Get updated appointment with new payment status
  const updated = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: includeConfig,
  });

  // Regenerate service order PDF to reflect payment changes
  if (updated?.serviceOrder) {
    try {
      await generateServiceOrderPdf(appointmentId, { refresh: true });
      logger.info('[PAYMENT] Service order PDF regenerated after final payment', { appointmentId });
    } catch (pdfError) {
      logger.error('[PAYMENT] Failed to regenerate service order PDF:', pdfError);
      // Don't fail the whole operation if PDF regeneration fails
    }
  }

  broadcastAppointment('updated', updated);

  const total = calculateAppointmentTotal(appointment);

  return {
    appointment: updated,
    payment,
    paymentSummary: {
      total,
      paid: Number(updated.advancePayment || 0),
      status: updated.paymentStatus,
    },
  };
};

const getPaymentStatus = async (prisma, appointmentId) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      serviceOrder: {
        include: {
          lineItems: true,
        },
      },
      invoices: {
        where: { status: { not: 'CANCELLED' } },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!appointment) {
    throw new AppError('Programarea nu a fost gasita. Verificati ID-ul programarii.', 404);
  }

  // Calculate total paid from Payment records
  const { calculateTotalPaid } = require('./paymentService');
  const totalPaid = await calculateTotalPaid(prisma, appointmentId);

  // Use invoice total if available (accounts for loyalty discount), otherwise use service order total
  const activeInvoice = appointment.invoices?.[0];
  const total = activeInvoice
    ? Number(activeInvoice.total)
    : calculateAppointmentTotal(appointment);

  const loyaltyDiscount = activeInvoice ? Number(activeInvoice.loyaltyDiscount || 0) : 0;
  const loyaltyTierAtTime = activeInvoice?.loyaltyTierAtTime || null;

  const remaining = Math.max(0, Math.round((total - totalPaid) * 100) / 100);

  return {
    total,
    totalPaid,
    status: appointment.paymentStatus,
    advancePayment: totalPaid > 0 ? {
      amount: totalPaid,
      paidAt: appointment.advancePaidAt,
    } : null,
    remaining,
    loyaltyDiscount,
    loyaltyTierAtTime,
    finalPayment: appointment.finalPaidAt ? {
      paidAt: appointment.finalPaidAt,
    } : null,
    isFullyPaid: appointment.paymentStatus === 'PAID',
  };
};

module.exports = {
  listAppointments,
  createAppointment,
  getAppointmentById,
  updateAppointment,
  cancelAppointment,
  recordAdvancePayment,
  recordFinalPayment,
  getPaymentStatus,
};
