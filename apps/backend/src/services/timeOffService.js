const { AppError } = require('../utils/errors');
const { mapTimeOffRequest } = require('../utils/transform');
const { broadcastTimeOff } = require('../realtime/events');
const { createNotification } = require('./notificationService');
const { sendLeaveRequestNotification } = require('./pushNotificationService');
const { optimizedTimeOffIncludes } = require('../utils/optimizedIncludes');
const { getPrismaPagination, createPaginatedResponse, parsePaginationParams } = require('../utils/pagination');

const normalizeLeaveType = (value) => (value ? value.toUpperCase().replace(/-/g, '_') : undefined);

const calculateTotalDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = (end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24);
  return diff >= 0 ? diff + 1 : 0;
};

const listTimeOffRequests = async (prisma, filters = {}, currentUser) => {
  const isAdmin = currentUser.roles?.some((role) => ['admin'].includes(role));
  const managerial = currentUser.roles?.some((role) => ['admin', 'manager'].includes(role));

  const where = {};

  if (filters.status) {
    where.status = filters.status.toUpperCase().replace(/-/g, '_');
  }

  if (!managerial) {
    where.employeeId = currentUser.id;
  } else if (filters.employee) {
    where.employeeId = filters.employee;
  }

  // Hide medical leaves from non-admins (even if they're the employee)
  if (!isAdmin) {
    where.isMedical = false;
  }

  if (filters.startDate || filters.endDate) {
    where.startDate = {};
    if (filters.startDate) {
      where.startDate.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.startDate.lte = new Date(filters.endDate);
    }
  }

  const requests = await prisma.timeOffRequest.findMany({
    where,
    include: optimizedTimeOffIncludes,
    orderBy: { createdAt: 'desc' },
    take: 100, // Safety limit
  });

  return requests.map(mapTimeOffRequest);
};

const createTimeOffRequest = async (prisma, payload, currentUser) => {
  const startDate = new Date(payload.startDate);
  const endDate = new Date(payload.endDate);

  // Check if start date is in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);

  if (startDate < today) {
    throw new AppError('Cannot request leave for past dates', 400);
  }

  const totalDays = calculateTotalDays(payload.startDate, payload.endDate);

  const request = await prisma.timeOffRequest.create({
    data: {
      employeeId: currentUser.id,
      leaveType: normalizeLeaveType(payload.leaveType) || 'VACATION',
      startDate,
      endDate,
      totalDays,
      reason: payload.reason,
      status: 'PENDING',
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
      reviewer: {
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      },
    },
  });

  // Notify all admin and manager users
  const adminsAndManagers = await prisma.user.findMany({
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
  const dateRange = `${startDate.toLocaleDateString('ro-RO')} - ${endDate.toLocaleDateString('ro-RO')}`;

  await Promise.all(
    adminsAndManagers.map((admin) =>
      createNotification(prisma, {
        recipientId: admin.id,
        title: 'Cerere de concediu noua',
        message: `${employeeName} a solicitat concediu pentru ${dateRange} (${totalDays} ${totalDays === 1 ? 'zi' : 'zile'})`,
        type: 'LEAVE',
        entityType: 'timeOffRequest',
        entityId: request.id,
        metadata: {
          requestId: request.id,
          employeeId: currentUser.id,
          startDate: payload.startDate,
          endDate: payload.endDate,
        },
      })
    )
  );

  // Send push notifications to admins and managers
  try {
    const recipientIds = adminsAndManagers.map(admin => admin.id);
    await sendLeaveRequestNotification(request, 'created', recipientIds);
  } catch (pushError) {
    console.error('Failed to send push notifications for leave request creation:', pushError);
    // Don't fail if push notifications fail
  }

  const mapped = mapTimeOffRequest(request);
  broadcastTimeOff('created', mapped);
  return mapped;
};

const approveTimeOffRequest = async (prisma, requestId, reviewer, { reviewNotes }) => {
  const request = await prisma.timeOffRequest.findUnique({
    where: { id: requestId },
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
    },
  });

  if (!request) {
    throw new AppError('Leave request not found', 404);
  }

  if (request.status !== 'PENDING') {
    throw new AppError('Request already processed', 400);
  }

  // Check max 1 technician and max 3 total employees per day
  const start = new Date(request.startDate);
  const end = new Date(request.endDate);

  // Fetch all approved requests that overlap with the requested date range
  // Include employee roles to check for technicians
  const overlappingRequests = await prisma.timeOffRequest.findMany({
    where: {
      status: 'APPROVED',
      OR: [
        {
          AND: [
            { startDate: { lte: end } },
            { endDate: { gte: start } },
          ],
        },
      ],
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
    },
  });

  // Get the roles of the current employee making the request
  const currentEmployeeRoles = request.employee.roles?.map(r => r.role?.key) || [];
  const isCurrentEmployeeTechnician = currentEmployeeRoles.includes('technician');

  // Check each day in the requested range
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);

    const approvedOnDay = overlappingRequests.filter((req) => {
      const reqStart = new Date(req.startDate);
      const reqEnd = new Date(req.endDate);
      return reqStart <= dayEnd && reqEnd >= dayStart;
    });

    // Count technicians on this day
    const techniciansOnDay = approvedOnDay.filter((req) => {
      const roles = req.employee?.roles?.map(r => r.role?.key) || [];
      return roles.includes('technician');
    });

    // Check max 1 technician per day
    if (isCurrentEmployeeTechnician && techniciansOnDay.length >= 1) {
      const dateStr = dayStart.toLocaleDateString('ro-RO');
      throw new AppError(`Limita maxima de 1 tehnician pe zi atinsa pentru ${dateStr}`, 400);
    }

    // Check max 3 total employees per day
    const totalEmployeesOnDay = approvedOnDay.length + 1; // +1 for current request
    if (totalEmployeesOnDay > 3) {
      const dateStr = dayStart.toLocaleDateString('ro-RO');
      throw new AppError(`Limita maxima de 3 angajati pe zi atinsa pentru ${dateStr}`, 400);
    }
  }

  const updated = await prisma.timeOffRequest.update({
    where: { id: requestId },
    data: {
      status: 'APPROVED',
      reviewerId: reviewer.id,
      reviewNotes,
      reviewedAt: new Date(),
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
      reviewer: {
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      },
    },
  });

  // Notify employee
  const reviewerName = `${reviewer.firstName} ${reviewer.lastName}`;
  const dateRange = `${start.toLocaleDateString('ro-RO')} - ${end.toLocaleDateString('ro-RO')}`;

  await createNotification(prisma, {
    recipientId: request.employeeId,
    title: 'Cerere de concediu aprobata',
    message: `Cererea ta de concediu pentru ${dateRange} a fost aprobata de ${reviewerName}${reviewNotes ? `: ${reviewNotes}` : ''}`,
    type: 'LEAVE',
    entityType: 'timeOffRequest',
    entityId: requestId,
    metadata: {
      requestId,
      reviewerId: reviewer.id,
      startDate: request.startDate,
      endDate: request.endDate,
    },
  });

  // Send push notification to employee
  try {
    await sendLeaveRequestNotification(updated, 'approved', [request.employeeId]);
  } catch (pushError) {
    console.error('Failed to send push notification for leave request approval:', pushError);
    // Don't fail if push notifications fail
  }

  const mapped = mapTimeOffRequest(updated);
  broadcastTimeOff('approved', mapped);
  return mapped;
};

const rejectTimeOffRequest = async (prisma, requestId, reviewer, { reviewNotes }) => {
  if (!reviewNotes) {
    throw new AppError('Review notes required when rejecting', 400);
  }

  const request = await prisma.timeOffRequest.findUnique({
    where: { id: requestId },
    include: { employee: true },
  });

  if (!request) {
    throw new AppError('Leave request not found', 404);
  }

  if (request.status !== 'PENDING') {
    throw new AppError('Request already processed', 400);
  }

  const updated = await prisma.timeOffRequest.update({
    where: { id: requestId },
    data: {
      status: 'REJECTED',
      reviewerId: reviewer.id,
      reviewNotes,
      reviewedAt: new Date(),
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
      reviewer: {
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      },
    },
  });

  // Notify employee
  const reviewerName = `${reviewer.firstName} ${reviewer.lastName}`;
  const start = new Date(request.startDate);
  const end = new Date(request.endDate);
  const dateRange = `${start.toLocaleDateString('ro-RO')} - ${end.toLocaleDateString('ro-RO')}`;

  await createNotification(prisma, {
    recipientId: request.employeeId,
    title: 'Cerere de concediu respinsa',
    message: `Cererea ta de concediu pentru ${dateRange} a fost respinsa de ${reviewerName}: ${reviewNotes}`,
    type: 'LEAVE',
    entityType: 'timeOffRequest',
    entityId: requestId,
    metadata: {
      requestId,
      reviewerId: reviewer.id,
      startDate: request.startDate,
      endDate: request.endDate,
      reviewNotes,
    },
  });

  // Send push notification to employee
  try {
    await sendLeaveRequestNotification(updated, 'rejected', [request.employeeId]);
  } catch (pushError) {
    console.error('Failed to send push notification for leave request rejection:', pushError);
    // Don't fail if push notifications fail
  }

  const mapped = mapTimeOffRequest(updated);
  broadcastTimeOff('rejected', mapped);
  return mapped;
};

/**
 * Create a medical leave for an employee (admin-only)
 * Medical leaves are:
 * - Created by admins for employees
 * - Not visible to the employee themselves
 * - Auto-approved
 */
const createMedicalLeave = async (prisma, payload, adminUser) => {
  const { employeeId, startDate, endDate, reason } = payload;

  const start = new Date(startDate);
  const end = new Date(endDate);

  // Validate employee exists
  const employee = await prisma.user.findUnique({
    where: { id: employeeId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  });

  if (!employee) {
    throw new AppError('Employee not found', 404);
  }

  const totalDays = calculateTotalDays(startDate, endDate);

  const request = await prisma.timeOffRequest.create({
    data: {
      employeeId: employee.id,
      leaveType: 'MEDICAL',
      startDate: start,
      endDate: end,
      totalDays,
      reason,
      isMedical: true,  // Mark as medical leave (hidden from employee)
      status: 'APPROVED', // Auto-approve medical leaves
      reviewerId: adminUser.id,
      reviewedAt: new Date(),
      reviewNotes: 'Medical leave created by admin',
    },
    include: optimizedTimeOffIncludes,
  });

  // Do NOT notify the employee (medical leaves are confidential)
  // Only broadcast to admins
  const mapped = mapTimeOffRequest(request);
  broadcastTimeOff('created', mapped);

  // Send push notifications only to admins (not the employee)
  try {
    const adminUsers = await prisma.user.findMany({
      where: {
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
    const adminIds = adminUsers.map(admin => admin.id);
    if (adminIds.length > 0) {
      await sendLeaveRequestNotification(request, 'created', adminIds);
    }
  } catch (pushError) {
    console.error('Failed to send push notifications for medical leave creation:', pushError);
    // Don't fail if push notifications fail
  }

  return mapped;
};

module.exports = {
  listTimeOffRequests,
  createTimeOffRequest,
  approveTimeOffRequest,
  rejectTimeOffRequest,
  createMedicalLeave,
};
