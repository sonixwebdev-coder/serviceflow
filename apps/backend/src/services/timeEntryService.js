const prisma = require('../../lib/prisma');
const { AppError } = require('../utils/errors');
const { mapTimeEntry } = require('../utils/transform');
const { createNotification } = require('./notificationService');
const { broadcastTimeEntry } = require('../realtime/events');
const { optimizedTimeEntryIncludes } = require('../utils/optimizedIncludes');
const { parsePaginationParams, createPaginatedResponse } = require('../utils/pagination');

const isManagerial = ({ roles }) => roles?.some((role) => ['admin', 'manager'].includes(role));

const listTimeEntries = async (filters = {}, currentUser, options = {}) => {
  const managerial = isManagerial(currentUser);
  const where = {};

  // Filter by employee
  if (!managerial) {
    // Regular users can only see their own records
    where.employeeId = currentUser.id;
  } else if (filters.employee) {
    // Managers can filter by specific employee
    where.employeeId = filters.employee;
  }
  // If manager and no employee filter, show all employees (no where clause)

  if (filters.startDate || filters.endDate) {
    where.clockIn = {};
    if (filters.startDate) {
      where.clockIn.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.clockIn.lte = new Date(filters.endDate);
    }
  }

  const orderBy = { clockIn: 'desc' };

  // Support pagination (optional for backward compatibility)
  if (options.paginate) {
    const pagination = parsePaginationParams(filters);

    const [entries, total] = await Promise.all([
      prisma.timeEntry.findMany({
        where,
        orderBy,
        include: optimizedTimeEntryIncludes,
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.timeEntry.count({ where }),
    ]);

    return createPaginatedResponse(entries.map(mapTimeEntry), total, pagination);
  }

  // Backward compatible: return all entries (but with safety limit)
  const entries = await prisma.timeEntry.findMany({
    where,
    orderBy,
    include: optimizedTimeEntryIncludes,
    take: 100, // Safety limit
  });

  return entries.map(mapTimeEntry);
};

const clockIn = async (payload = {}, currentUser) => {
  const openEntry = await prisma.timeEntry.findFirst({
    where: { employeeId: currentUser.id, clockOut: null },
  });

  if (openEntry) {
    throw new AppError('You already have an active time tracking entry', 400);
  }

  const clockInTime = new Date();

  const entry = await prisma.timeEntry.create({
    data: {
      employeeId: currentUser.id,
      scheduleId: payload.schedule || null,
      clockIn: clockInTime,
      clockInLocation: payload.clockInLocation,
      source: payload.schedule ? 'SCHEDULE' : 'MANUAL',
    },
    include: {
      employee: {
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      },
      schedule: true,
    },
  });

  if (payload.schedule) {
    await prisma.schedule.update({
      where: { id: payload.schedule },
      data: {
        actualStartTime: clockInTime.toISOString(),
        status: 'IN_PROGRESS',
      },
    });
  }

  // Notify managers when employee clocks in
  const managers = await prisma.user.findMany({
    where: {
      isActive: true,
      roles: {
        some: {
          role: {
            key: {
              in: ['admin', 'manager'],
            },
          },
        },
      },
    },
  });

  const employeeName = `${currentUser.firstName} ${currentUser.lastName}`;
  await Promise.all(
    managers.map((manager) =>
      createNotification({
        recipientId: manager.id,
        title: 'Angajat pontare intrare',
        message: `${employeeName} a pontaras intrare la ${clockInTime.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}`,
        type: 'SYSTEM',
        entityType: 'timeEntry',
        entityId: entry.id,
      })
    )
  );

  const mapped = mapTimeEntry(entry);
  broadcastTimeEntry('created', mapped);
  return mapped;
};

const clockOut = async (entryId, payload = {}, currentUser) => {
  const entry = await prisma.timeEntry.findUnique({ where: { id: entryId } });

  if (!entry) {
    throw new AppError('Time tracking record not found', 404);
  }

  const managerial = isManagerial(currentUser);
  if (!managerial && entry.employeeId !== currentUser.id) {
    throw new AppError('You do not have permission to modify this record', 403);
  }

  if (entry.clockOut) {
    throw new AppError('Record already clocked out', 400);
  }

  const clockOutTime = new Date();
  const breakDuration = typeof payload.breakDuration === 'number' ? payload.breakDuration : entry.breakDuration;

  const totalMinutes = Math.max(
    Math.round((clockOutTime.getTime() - entry.clockIn.getTime()) / 60000) - (breakDuration || 0),
    0
  );

  const updated = await prisma.timeEntry.update({
    where: { id: entryId },
    data: {
      clockOut: clockOutTime,
      breakDuration,
      clockOutLocation: payload.clockOutLocation,
      totalMinutes,
    },
    include: {
      employee: {
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      },
      schedule: true,
    },
  });

  if (entry.scheduleId) {
    await prisma.schedule.update({
      where: { id: entry.scheduleId },
      data: {
        actualEndTime: clockOutTime.toISOString(),
        status: 'COMPLETED',
      },
    });
  }

  const totalHours = (totalMinutes / 60).toFixed(2);

  // Notify employee
  await createNotification({
    recipientId: entry.employeeId,
    title: 'Schimb finalizat',
    message: `Schimbul tau a fost finalizat. Total: ${totalHours} ore${breakDuration ? ` (pauza: ${breakDuration} min)` : ''}.`,
    type: 'SYSTEM',
    entityType: 'timeEntry',
    entityId: entry.id,
  });

  // Notify managers when employee clocks out
  const managers = await prisma.user.findMany({
    where: {
      isActive: true,
      roles: {
        some: {
          role: {
            key: {
              in: ['admin', 'manager'],
            },
          },
        },
      },
    },
  });

  const employee = await prisma.user.findUnique({ where: { id: entry.employeeId } });
  const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Angajat';

  await Promise.all(
    managers.map((manager) =>
      createNotification({
        recipientId: manager.id,
        title: 'Angajat pontare iesire',
        message: `${employeeName} a pontaras iesire. Total: ${totalHours} ore${breakDuration ? ` (pauza: ${breakDuration} min)` : ''}.`,
        type: 'SYSTEM',
        entityType: 'timeEntry',
        entityId: entry.id,
      })
    )
  );

  const mapped = mapTimeEntry(updated);
  broadcastTimeEntry('updated', mapped);
  return mapped;
};

const deleteTimeEntry = async (entryId) => {
  await prisma.timeEntry.delete({ where: { id: entryId } });
  broadcastTimeEntry('deleted', { id: entryId, _id: entryId });
};

module.exports = {
  listTimeEntries,
  clockIn,
  clockOut,
  deleteTimeEntry,
};
