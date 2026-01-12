const { getAuthenticatedCalendarClient, getCalendarConfig } = require('./googleOAuthService');
const logger = require('../../utils/logger');

/**
 * Convert appointment to Google Calendar event
 */
const appointmentToGoogleEvent = (appointment, client) => {
  const clientName = client?.type === 'SRL'
    ? client.companyName
    : `${client?.firstName || ''} ${client?.lastName || ''}`.trim();

  return {
    summary: appointment.title || `Programare - ${clientName}`,
    description: [
      appointment.description,
      client?.phone ? `Tel: ${client.phone}` : null,
      client?.email ? `Email: ${client.email}` : null,
    ].filter(Boolean).join('\n'),
    location: appointment.location,
    start: {
      dateTime: new Date(appointment.scheduledStart).toISOString(),
      timeZone: 'Europe/Bucharest',
    },
    end: {
      dateTime: new Date(appointment.scheduledEnd).toISOString(),
      timeZone: 'Europe/Bucharest',
    },
    colorId: getColorByStatus(appointment.status),
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1 day before
        { method: 'popup', minutes: 60 }, // 1 hour before
      ],
    },
  };
};

/**
 * Get Google Calendar color ID by appointment status
 */
const getColorByStatus = (status) => {
  const colorMap = {
    PENDING: '5',      // Yellow
    PREZENTAT: '9',    // Blue
    IN_PROGRESS: '3',  // Purple
    COMPLETED: '10',   // Green
    CANCELLED: '11',   // Red
  };
  return colorMap[status] || '1';
};

/**
 * Create event in Google Calendar
 */
const createEvent = async (prisma, userId, appointment, client) => {
  try {
    const calendar = await getAuthenticatedCalendarClient(prisma, userId);
    const config = await getCalendarConfig(prisma, userId);

    if (!config || !config.syncEnabled) {
      logger.info(`Google Calendar sync disabled for user ${userId}`);
      return null;
    }

    const event = appointmentToGoogleEvent(appointment, client);

    const response = await calendar.events.insert({
      calendarId: config.calendarId || 'primary',
      resource: event,
    });

    // Store sync record
    const syncRecord = await prisma.calendarEventSync.create({
      data: {
        appointmentId: appointment.id,
        googleEventId: response.data.id,
        configId: config.id,
        syncStatus: 'SYNCED',
        lastSyncAt: new Date(),
      },
    });

    logger.info(`Created Google Calendar event ${response.data.id} for appointment ${appointment.id}`);
    return syncRecord;
  } catch (error) {
    logger.error(`Failed to create Google Calendar event:`, error);

    // Record the error
    const config = await getCalendarConfig(prisma, userId);
    if (config) {
      await prisma.calendarEventSync.upsert({
        where: {
          appointmentId_configId: {
            appointmentId: appointment.id,
            configId: config.id,
          },
        },
        update: {
          syncStatus: 'ERROR',
          errorMessage: error.message,
        },
        create: {
          appointmentId: appointment.id,
          googleEventId: '',
          configId: config.id,
          syncStatus: 'ERROR',
          errorMessage: error.message,
        },
      });
    }

    return null;
  }
};

/**
 * Update event in Google Calendar
 */
const updateEvent = async (prisma, userId, appointment, client) => {
  try {
    const calendar = await getAuthenticatedCalendarClient(prisma, userId);
    const config = await getCalendarConfig(prisma, userId);

    if (!config || !config.syncEnabled) {
      return null;
    }

    // Get existing sync record
    const syncRecord = await prisma.calendarEventSync.findUnique({
      where: {
        appointmentId_configId: {
          appointmentId: appointment.id,
          configId: config.id,
        },
      },
    });

    if (!syncRecord || !syncRecord.googleEventId) {
      // Create new event if not synced before
      return createEvent(prisma, userId, appointment, client);
    }

    const event = appointmentToGoogleEvent(appointment, client);

    const response = await calendar.events.update({
      calendarId: config.calendarId || 'primary',
      eventId: syncRecord.googleEventId,
      resource: event,
    });

    // Update sync record
    await prisma.calendarEventSync.update({
      where: { id: syncRecord.id },
      data: {
        syncStatus: 'SYNCED',
        lastSyncAt: new Date(),
        errorMessage: null,
      },
    });

    logger.info(`Updated Google Calendar event ${response.data.id} for appointment ${appointment.id}`);
    return syncRecord;
  } catch (error) {
    logger.error(`Failed to update Google Calendar event:`, error);

    const config = await getCalendarConfig(prisma, userId);
    if (config) {
      await prisma.calendarEventSync.upsert({
        where: {
          appointmentId_configId: {
            appointmentId: appointment.id,
            configId: config.id,
          },
        },
        update: {
          syncStatus: 'ERROR',
          errorMessage: error.message,
        },
        create: {
          appointmentId: appointment.id,
          googleEventId: '',
          configId: config.id,
          syncStatus: 'ERROR',
          errorMessage: error.message,
        },
      });
    }

    return null;
  }
};

/**
 * Delete event from Google Calendar
 */
const deleteEvent = async (prisma, userId, appointmentId) => {
  try {
    const calendar = await getAuthenticatedCalendarClient(prisma, userId);
    const config = await getCalendarConfig(prisma, userId);

    if (!config) {
      return null;
    }

    const syncRecord = await prisma.calendarEventSync.findUnique({
      where: {
        appointmentId_configId: {
          appointmentId,
          configId: config.id,
        },
      },
    });

    if (!syncRecord || !syncRecord.googleEventId) {
      return null;
    }

    await calendar.events.delete({
      calendarId: config.calendarId || 'primary',
      eventId: syncRecord.googleEventId,
    });

    // Remove sync record
    await prisma.calendarEventSync.delete({
      where: { id: syncRecord.id },
    });

    logger.info(`Deleted Google Calendar event ${syncRecord.googleEventId} for appointment ${appointmentId}`);
    return { success: true };
  } catch (error) {
    logger.error(`Failed to delete Google Calendar event:`, error);
    return null;
  }
};

/**
 * Sync all appointments for a user
 */
const syncAllAppointments = async (prisma, userId) => {
  const config = await getCalendarConfig(prisma, userId);

  if (!config || !config.syncEnabled) {
    return { success: false, error: 'Calendar sync not enabled' };
  }

  try {
    const calendar = await getAuthenticatedCalendarClient(prisma, userId);

    // Get user's appointments
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return { success: false, error: 'User has no organization' };
    }

    // Get upcoming appointments for the user
    const appointments = await prisma.appointment.findMany({
      where: {
        organizationId: user.organizationId,
        scheduledStart: { gte: new Date() },
        status: { not: 'CANCELLED' },
        OR: [
          { createdById: userId },
          { assignees: { some: { userId } } },
        ],
      },
      include: {
        client: true,
      },
      take: 100,
    });

    const results = {
      total: appointments.length,
      created: 0,
      updated: 0,
      errors: 0,
    };

    for (const appointment of appointments) {
      const existing = await prisma.calendarEventSync.findUnique({
        where: {
          appointmentId_configId: {
            appointmentId: appointment.id,
            configId: config.id,
          },
        },
      });

      if (existing?.googleEventId) {
        const result = await updateEvent(prisma, userId, appointment, appointment.client);
        if (result) results.updated++;
        else results.errors++;
      } else {
        const result = await createEvent(prisma, userId, appointment, appointment.client);
        if (result) results.created++;
        else results.errors++;
      }
    }

    // Update last sync time
    await prisma.googleCalendarConfig.update({
      where: { userId },
      data: { lastSyncAt: new Date() },
    });

    logger.info(`Synced ${results.created + results.updated} appointments for user ${userId}`);
    return { success: true, results };
  } catch (error) {
    logger.error(`Failed to sync appointments for user ${userId}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * List user's calendars
 */
const listCalendars = async (prisma, userId) => {
  try {
    const calendar = await getAuthenticatedCalendarClient(prisma, userId);

    const response = await calendar.calendarList.list();
    return response.data.items.map((cal) => ({
      id: cal.id,
      summary: cal.summary,
      primary: cal.primary || false,
      accessRole: cal.accessRole,
    }));
  } catch (error) {
    logger.error(`Failed to list calendars:`, error);
    throw error;
  }
};

/**
 * Update sync settings
 */
const updateSyncSettings = async (prisma, userId, { calendarId, syncEnabled }) => {
  const config = await getCalendarConfig(prisma, userId);

  if (!config) {
    throw new Error('Google Calendar not connected');
  }

  return prisma.googleCalendarConfig.update({
    where: { userId },
    data: {
      calendarId: calendarId ?? config.calendarId,
      syncEnabled: syncEnabled ?? config.syncEnabled,
    },
  });
};

/**
 * Get sync status for an appointment
 */
const getAppointmentSyncStatus = async (prisma, userId, appointmentId) => {
  const config = await getCalendarConfig(prisma, userId);

  if (!config) {
    return null;
  }

  return prisma.calendarEventSync.findUnique({
    where: {
      appointmentId_configId: {
        appointmentId,
        configId: config.id,
      },
    },
  });
};

module.exports = {
  createEvent,
  updateEvent,
  deleteEvent,
  syncAllAppointments,
  listCalendars,
  updateSyncSettings,
  getAppointmentSyncStatus,
};
