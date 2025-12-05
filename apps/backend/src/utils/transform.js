const { Decimal } = require('@prisma/client/runtime/library');

const decimalToNumber = (value) => {
  if (value === null || typeof value === 'undefined') {
    return null;
  }
  if (value instanceof Decimal) {
    return value.toNumber();
  }
  if (typeof value === 'string') {
    return parseFloat(value);
  }
  return Number(value);
};

const toLegacyId = (entity) => {
  if (!entity) {
    return null;
  }
  return Object.prototype.hasOwnProperty.call(entity, '_id')
    ? entity
    : { ...entity, _id: entity.id };
};

const formatEnum = (value) => (typeof value === 'string' ? value.toLowerCase().replace(/_/g, '-') : value);

const mapUser = (user) => {
  if (!user) return null;

  const primaryRole = user.roles?.[0]?.role?.key || user.role || null;
  const mappedRoles = user.roles
    ? user.roles.map((assignment) => ({
        id: assignment.roleId || assignment.id,
        _id: assignment.roleId || assignment.id,
        key: assignment.role?.key || null,
        name: assignment.role?.name || null,
      }))
    : [];

  return {
    id: user.id,
    _id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    dateOfBirth: user.dateOfBirth,
    employmentType: formatEnum(user.employmentType),
    hourlyRate: decimalToNumber(user.hourlyRate) || 0,
    hireDate: user.hireDate,
    isActive: user.isActive,
    avatarUrl: user.avatarUrl,
    role: primaryRole,
    roles: mappedRoles,
    permissions: user.permissions || [],
    leaveBalance: {
      vacation: user.leaveBalanceVacation,
      sick: user.leaveBalanceSick,
      personal: user.leaveBalancePersonal,
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const mapSchedule = (schedule) => {
  if (!schedule) return null;

  return {
    id: schedule.id,
    _id: schedule.id,
    employee: mapUser(schedule.employee),
    employeeId: schedule.employeeId,
    createdBy: mapUser(schedule.createdBy),
    updatedBy: mapUser(schedule.updatedBy),
    date: schedule.date,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    shiftType: formatEnum(schedule.shiftType),
    status: formatEnum(schedule.status),
    location: schedule.location,
    actualStartTime: schedule.actualStartTime,
    actualEndTime: schedule.actualEndTime,
    notes: schedule.notes,
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt,
  };
};

const mapTask = (task) => {
  if (!task) return null;

  const assignedTo = task.assignments?.map((assignment) => mapUser(assignment.user)) || [];
  const comments = task.comments?.map((comment) => ({
    id: comment.id,
    _id: comment.id,
    text: comment.text,
    createdAt: comment.createdAt,
    user: mapUser(comment.author),
  })) || [];

  // Get comment count from _count or from comments array length
  const commentCount = task._count?.comments ?? comments.length;

  return {
    id: task.id,
    _id: task.id,
    title: task.title,
    description: task.description,
    taskType: formatEnum(task.taskType),
    priority: formatEnum(task.priority),
    status: formatEnum(task.status),
    assignedTo,
    dueDate: task.dueDate,
    estimatedHours: task.estimatedHours,
    completionPercentage: task.completionPercentage,
    customerName: task.customerName,
    customerPhone: task.customerPhone,
    customerVehicle: task.customerVehicle,
    products: task.products?.map((product) => ({
      id: product.id,
      _id: product.id,
      productName: product.productName,
      sku: product.sku,
      quantity: product.quantity,
    })) || [],
    comments,
    commentCount,
    createdBy: mapUser(task.createdBy),
    updatedBy: mapUser(task.updatedBy),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
};

const mapTimeEntry = (entry) => {
  if (!entry) return null;

  const totalHours = entry.totalMinutes ? Math.round((entry.totalMinutes / 60) * 100) / 100 : 0;

  return {
    id: entry.id,
    _id: entry.id,
    employee: mapUser(entry.employee),
    scheduleId: entry.scheduleId,
    clockIn: entry.clockIn,
    clockOut: entry.clockOut,
    breakDuration: entry.breakDuration,
    totalHours,
    totalMinutes: entry.totalMinutes,
    clockInLocation: entry.clockInLocation,
    clockOutLocation: entry.clockOutLocation,
    notes: entry.notes,
    source: formatEnum(entry.source),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
};

const mapTimeOffRequest = (request) => {
  if (!request) return null;

  return {
    id: request.id,
    _id: request.id,
    employee: mapUser(request.employee),
    reviewer: mapUser(request.reviewer),
    reviewedBy: mapUser(request.reviewer),
    leaveType: formatEnum(request.leaveType),
    status: formatEnum(request.status),
    startDate: request.startDate,
    endDate: request.endDate,
    totalDays: request.totalDays,
    reason: request.reason,
    reviewNotes: request.reviewNotes,
    reviewedAt: request.reviewedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
  };
};

const mapNotification = (notification) => {
  if (!notification) return null;

  return {
    id: notification.id,
    _id: notification.id,
    recipient: mapUser(notification.recipient),
    title: notification.title,
    message: notification.message,
    type: formatEnum(notification.type),
    entityType: notification.entityType,
    entityId: notification.entityId,
    metadata: notification.metadata,
    isRead: notification.isRead,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  };
};

const mapPersonalTodo = (todo) => {
  if (!todo) return null;

  return {
    id: todo.id,
    _id: todo.id,
    userId: todo.userId,
    title: todo.title,
    description: todo.description,
    isCompleted: todo.isCompleted,
    priority: formatEnum(todo.priority),
    dueDate: todo.dueDate,
    completedAt: todo.completedAt,
    createdAt: todo.createdAt,
    updatedAt: todo.updatedAt,
  };
};

module.exports = {
  toLegacyId,
  mapUser,
  mapSchedule,
  mapTask,
  mapTimeEntry,
  mapTimeOffRequest,
  mapNotification,
  mapPersonalTodo,
  decimalToNumber,
  formatEnum,
};
