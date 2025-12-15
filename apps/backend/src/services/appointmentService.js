const { AppError } = require('../utils/errors');
const { broadcastAppointment, broadcastServiceOrder } = require('../realtime/events');
const { getCompanySettings } = require('./companySettingService');
const { upsertServiceOrder, generateServiceOrderPdf } = require('./serviceOrderService');
const { createNotification } = require('./notificationService');
const { sendAppointmentNotification } = require('./pushNotificationService');
const { optimizedAppointmentIncludes, minimalAppointmentIncludes } = require('../utils/optimizedIncludes');
const { getPrismaPagination, createPaginatedResponse, parsePaginationParams } = require('../utils/pagination');
const { createPayment } = require('./paymentService');
const logger = require('../utils/logger');

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

const ensureRampAvailability = async (tx, scheduledStart, scheduledEnd, excludeAppointmentId) => {
  const settings = await getCompanySettings();
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

const resolveClient = async (tx, clientPayload, fallbackId) => {
  if (!clientPayload && !fallbackId) return null;

  let client = null;

  if (fallbackId) {
    client = await tx.client.findUnique({ where: { id: fallbackId } });
    if (!client) {
      throw new AppError('Clientul nu a fost gasit. Va rugam selectati un client valid sau creati unul nou.', 404);
    }
  }

  if (clientPayload?.id && (!client || client.id !== clientPayload.id)) {
    client = await tx.client.findUnique({ where: { id: clientPayload.id } });
    if (!client) {
      throw new AppError('Clientul specificat nu a fost gasit. Va rugam verificati datele clientului.', 404);
    }
  }

  const type = normalizeClientType(clientPayload?.type, client?.type || (clientPayload?.companyName ? 'SRL' : 'PF'));

  if (!client && clientPayload) {
    if (type === 'SRL') {
      if (clientPayload.vatNumber) {
        client = await tx.client.findFirst({ where: { vatNumber: clientPayload.vatNumber } });
      }
      if (!client && clientPayload.registrationNumber) {
        client = await tx.client.findFirst({ where: { registrationNumber: clientPayload.registrationNumber } });
      }
    } else {
      if (clientPayload.email) {
        client = await tx.client.findFirst({ where: { email: clientPayload.email } });
      }
      if (!client && clientPayload.phone) {
        client = await tx.client.findFirst({ where: { phone: clientPayload.phone } });
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

  return tx.client.create({ data });
};

const resolveVehicle = async (tx, clientId, vehiclePayload, fallbackId) => {
  if (!vehiclePayload && !fallbackId) return null;

  let vehicle = null;

  if (fallbackId) {
    vehicle = await tx.vehicle.findUnique({ where: { id: fallbackId } });
    if (!vehicle) {
      throw new AppError('Vehiculul nu a fost gasit. Va rugam selectati un vehicul valid sau creati unul nou.', 404);
    }
  }

  if (vehiclePayload?.id && (!vehicle || vehicle.id !== vehiclePayload.id)) {
    vehicle = await tx.vehicle.findUnique({ where: { id: vehiclePayload.id } });
    if (!vehicle) {
      throw new AppError('Vehiculul specificat nu a fost gasit. Va rugam verificati datele vehiculului.', 404);
    }
  }

  if (!vehicle && vehiclePayload?.vin) {
    vehicle = await tx.vehicle.findUnique({ where: { vin: vehiclePayload.vin } });
  }

  if (!vehicle && clientId && vehiclePayload?.plateNumber) {
    vehicle = await tx.vehicle.findFirst({ where: { clientId, plateNumber: vehiclePayload.plateNumber } });
  }

  const data = {};
  const fields = ['make', 'model', 'plateNumber', 'vin', 'carId', 'color', 'notes'];
  fields.forEach((field) => assignIfProvided(data, vehiclePayload, field));
  assignNumberIfProvided(data, vehiclePayload, 'year', (value) => {
    const int = Number(value);
    return Number.isFinite(int) ? Math.round(int) : undefined;
  });
  assignNumberIfProvided(data, vehiclePayload, 'odometerKm', (value) => {
    const int = Number(value);
    return Number.isFinite(int) ? Math.max(0, Math.round(int)) : undefined;
  });

  if (clientId) {
    data.clientId = clientId;
  }

  if (vehicle) {
    if (Object.keys(data).length > 0) {
      vehicle = await tx.vehicle.update({ where: { id: vehicle.id }, data });
    }
    return vehicle;
  }

  if (!clientId) {
    throw new AppError('Vehiculul trebuie sa fie asociat cu un client. Va rugam selectati un client mai intai.', 400);
  }

  return tx.vehicle.create({
    data: {
      clientId,
      ...data,
    },
  });
};

const listAppointments = async (prisma, filters = {}, options = {}) => {
  const { status, from, to, clientId, assigneeId } = filters;
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
  const appointments = await prisma.appointment.findMany({
    where,
    include: includeConfig,
    orderBy,
    take: 100, // Safety limit
  });

  return appointments;
};

const createAppointment = async (prisma, payload, currentUser) => {
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

  let appointment = null;
  let serviceOrderEvent = null;

  await prisma.$transaction(async (tx) => {
    await ensureAssigneePermissions(tx, payload.assigneeIds, currentUser);
    await ensureRampAvailability(tx, scheduledStart, scheduledEnd);

    const client = await resolveClient(tx, payload.client, payload.clientId);
    const vehicle = await resolveVehicle(tx, client?.id || payload.clientId || null, payload.vehicle, payload.vehicleId);

    const data = {
      title: payload.title,
      description: payload.description,
      status: mapStatus(payload.status) || 'PENDING',
      scheduledStart,
      scheduledEnd,
      location: payload.location,
      clientId: client?.id || null,
      vehicleId: vehicle?.id || null,
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
    } catch (error) {
      if (error.code === 'P2003') {
        throw new AppError('Related entity not found', 400);
      }
      throw error;
    }

    if (payload.serviceOrder) {
      await upsertServiceOrder(appointment.id, payload.serviceOrder, {
        tx,
        skipBroadcast: true,
        onResult: (order, action) => {
          serviceOrderEvent = { order, action };
        },
      });

      appointment = await tx.appointment.findUnique({
        where: { id: appointment.id },
        include: includeConfig,
      });

      // Calculate payment status if advance payment was provided
      if (payload.advancePayment && payload.advancePayment > 0 && appointment.serviceOrder) {
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
            role: {
              name: { in: ['admin', 'ADMIN', 'Admin'] },
            },
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
    await ensureRampAvailability(tx, scheduledStart, scheduledEnd, appointmentId);

    const client = await resolveClient(tx, payload.client, payload.clientId ?? existing.clientId);
    const vehicle = await resolveVehicle(
      tx,
      client?.id || payload.clientId || existing.clientId,
      payload.vehicle,
      payload.vehicleId ?? existing.vehicleId
    );

    const data = {
      title: payload.title ?? existing.title,
      description: payload.description ?? existing.description,
      status: mapStatus(payload.status) || existing.status,
      scheduledStart,
      scheduledEnd,
      location: payload.location ?? existing.location,
      clientId: client?.id ?? existing.clientId,
      vehicleId: vehicle?.id ?? existing.vehicleId,
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
      await upsertServiceOrder(appointmentId, payload.serviceOrder, {
        tx,
        skipBroadcast: true,
        onResult: (order, action) => {
          serviceOrderEvent = { order, action };
        },
      });

      updated = await tx.appointment.findUnique({
        where: { id: appointmentId },
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
      payload.vehicle ||
      payload.vehicleId ||
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
              role: {
                key: {
                  in: ['admin', 'ADMIN', 'Admin'],
                },
              },
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

  return updated;
};

const cancelAppointment = async (prisma, appointmentId, reason, currentUser) => {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    throw new AppError('Programarea nu a fost gasita. Verificati ID-ul programarii.', 404);
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

  // Send push notifications for cancellation
  try {
    await sendAppointmentNotification(updated, 'cancelled');
    logger.notification('Push notifications sent for appointment cancellation', { appointmentId: updated.id });
  } catch (pushError) {
    logger.error('Failed to send push notifications for appointment cancellation', { error: pushError.message, appointmentId: updated.id });
    // Don't fail if push notifications fail
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

  const total = appointment.serviceOrder.lineItems.reduce((sum, item) => {
    const itemTotal = Number(item.totalPrice || 0);
    return sum + itemTotal;
  }, 0);

  return roundCurrency(total);
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
    },
  });

  if (!appointment) {
    throw new AppError('Programarea nu a fost gasita. Verificati ID-ul programarii.', 404);
  }

  const total = calculateAppointmentTotal(appointment);

  // Calculate total paid from Payment records
  const { calculateTotalPaid } = require('./paymentService');
  const totalPaid = await calculateTotalPaid(appointmentId);

  const remaining = Number(appointment.remainingBalance || 0);

  return {
    total: total,
    totalPaid: totalPaid, // Total from all Payment records
    status: appointment.paymentStatus,
    advancePayment: totalPaid > 0 ? {
      amount: totalPaid, // Use totalPaid from Payment records
      paidAt: appointment.advancePaidAt,
    } : null,
    remaining: remaining,
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
