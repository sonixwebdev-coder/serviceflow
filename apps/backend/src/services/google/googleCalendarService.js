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

/**
 * Import events from Google Calendar into CRM
 * Only imports events that don't already exist in the CRM
 * @param {object} prisma - Prisma client
 * @param {string} userId - User ID
 * @param {object} options - Import options
 * @param {Date} options.timeMin - Start date for events (default: now)
 * @param {Date} options.timeMax - End date for events (default: 30 days from now)
 * @param {number} options.maxResults - Maximum events to fetch (default: 50)
 */
const importEventsFromGoogle = async (prisma, userId, options = {}) => {
  const config = await getCalendarConfig(prisma, userId);

  if (!config || !config.syncEnabled) {
    return { success: false, error: 'Calendar sync not enabled' };
  }

  try {
    const calendar = await getAuthenticatedCalendarClient(prisma, userId);

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return { success: false, error: 'User has no organization' };
    }

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Fetch events from Google Calendar
    const response = await calendar.events.list({
      calendarId: config.calendarId || 'primary',
      timeMin: (options.timeMin || now).toISOString(),
      timeMax: (options.timeMax || thirtyDaysFromNow).toISOString(),
      maxResults: options.maxResults || 50,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const googleEvents = response.data.items || [];
    logger.info(`[GCAL] Fetched ${googleEvents.length} events from Google Calendar for user ${userId}`);

    // Get all existing sync records to know which events are already synced
    const existingSyncRecords = await prisma.calendarEventSync.findMany({
      where: { configId: config.id },
      select: { googleEventId: true, appointmentId: true },
    });

    const syncedGoogleEventIds = new Set(existingSyncRecords.map((r) => r.googleEventId));

    // Also check appointments with googleEventId in metadata (for previously imported)
    const appointmentsWithGoogleEvent = await prisma.appointment.findMany({
      where: {
        organizationId: user.organizationId,
        metadata: { path: ['googleEventId'], not: null },
      },
      select: { id: true, metadata: true },
    });

    const importedGoogleEventIds = new Set();
    appointmentsWithGoogleEvent.forEach((apt) => {
      const googleEventId = apt.metadata?.googleEventId;
      if (googleEventId) {
        importedGoogleEventIds.add(googleEventId);
      }
    });

    const results = {
      total: googleEvents.length,
      imported: 0,
      skipped: 0,
      errors: 0,
      importedAppointments: [],
    };

    for (const event of googleEvents) {
      // Skip events without proper date/time
      if (!event.start?.dateTime || !event.end?.dateTime) {
        logger.debug(`[GCAL] Skipping all-day or invalid event: ${event.summary}`);
        results.skipped++;
        continue;
      }

      // Skip if already synced from CRM
      if (syncedGoogleEventIds.has(event.id)) {
        logger.debug(`[GCAL] Skipping already synced event: ${event.summary}`);
        results.skipped++;
        continue;
      }

      // Skip if already imported
      if (importedGoogleEventIds.has(event.id)) {
        logger.debug(`[GCAL] Skipping already imported event: ${event.summary}`);
        results.skipped++;
        continue;
      }

      try {
        // Create appointment from Google event
        const appointment = await prisma.appointment.create({
          data: {
            title: event.summary || 'Google Calendar Event',
            description: event.description || null,
            location: event.location || null,
            scheduledStart: new Date(event.start.dateTime),
            scheduledEnd: new Date(event.end.dateTime),
            status: 'PENDING',
            createdById: userId,
            updatedById: userId,
            organizationId: user.organizationId,
            metadata: {
              googleEventId: event.id,
              importedFromGoogle: true,
              importedAt: new Date().toISOString(),
            },
          },
        });

        // Create sync record
        await prisma.calendarEventSync.create({
          data: {
            appointmentId: appointment.id,
            googleEventId: event.id,
            configId: config.id,
            syncStatus: 'SYNCED',
            lastSyncAt: new Date(),
          },
        });

        results.imported++;
        results.importedAppointments.push({
          id: appointment.id,
          title: appointment.title,
          googleEventId: event.id,
        });

        logger.info(`[GCAL] Imported event "${event.summary}" as appointment ${appointment.id}`);
      } catch (err) {
        logger.error(`[GCAL] Failed to import event "${event.summary}":`, err);
        results.errors++;
      }
    }

    // Update last sync time
    await prisma.googleCalendarConfig.update({
      where: { userId },
      data: { lastSyncAt: new Date() },
    });

    logger.info(`[GCAL] Import complete for user ${userId}: ${results.imported} imported, ${results.skipped} skipped, ${results.errors} errors`);
    return { success: true, results };
  } catch (error) {
    logger.error(`[GCAL] Failed to import events from Google Calendar for user ${userId}:`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Two-way sync: Export CRM appointments to Google and import Google events to CRM
 * @param {object} prisma - Prisma client
 * @param {string} userId - User ID
 */
const syncBidirectional = async (prisma, userId) => {
  const config = await getCalendarConfig(prisma, userId);

  if (!config || !config.syncEnabled) {
    return { success: false, error: 'Calendar sync not enabled' };
  }

  const results = {
    export: null,
    import: null,
  };

  // First, export CRM appointments to Google
  results.export = await syncAllAppointments(prisma, userId);

  // Then, import Google events to CRM
  results.import = await importEventsFromGoogle(prisma, userId);

  return {
    success: results.export.success && results.import.success,
    results,
  };
};

module.exports = {
  createEvent,
  updateEvent,
  deleteEvent,
  syncAllAppointments,
  listCalendars,
  updateSyncSettings,
  getAppointmentSyncStatus,
  importEventsFromGoogle,
  syncBidirectional,
};
