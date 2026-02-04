const { AppError } = require('../utils/errors');
const { mapTask } = require('../utils/transform');
const { createNotification } = require('./notificationService');
const { sendTaskNotification } = require('./pushNotificationService');
const { broadcastTask } = require('../realtime/events');
const { optimizedTaskIncludes, minimalTaskIncludes } = require('../utils/optimizedIncludes');
const { getPrismaPagination, createPaginatedResponse, parsePaginationParams } = require('../utils/pagination');

const normalize = (value) => (value ? value.toUpperCase().replace(/-/g, '_') : undefined);

// Keep old includes for backward compatibility in single task fetch
const withTaskIncludes = optimizedTaskIncludes;

const isManagerial = ({ roles }) => roles?.some((role) => ['admin', 'manager'].includes(role));

const buildTaskWhere = (filters, currentUser, options = {}) => {
  const { locationFilter = {} } = options;
  const where = {};

  // Apply location filter
  if (locationFilter && Object.keys(locationFilter).length > 0) {
    Object.assign(where, locationFilter);
  }

  if (filters.status) {
    where.status = normalize(filters.status);
  }

  if (filters.priority) {
    where.priority = normalize(filters.priority);
  }

  if (filters.taskType) {
    where.taskType = normalize(filters.taskType);
  }

  if (filters.assignedTo) {
    where.assignments = {
      some: {
        userId: filters.assignedTo,
      },
    };
  }

  // All users (including admins) now only see tasks they created or are assigned to
  where.OR = [
    {
      assignments: {
        some: {
          userId: currentUser.id,
        },
      },
    },
    { createdById: currentUser.id },
  ];

  return where;
};

const listTasks = async (prisma, filters = {}, currentUser, options = {}) => {
  const { locationFilter = {} } = options;
  const where = buildTaskWhere(filters, currentUser, { locationFilter });
  const orderBy = [{ dueDate: 'asc' }, { priority: 'desc' }];

  // Support pagination (optional for backward compatibility)
  if (options.paginate) {
    const pagination = parsePaginationParams(filters);

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          ...minimalTaskIncludes,
          _count: {
            select: { comments: true },
          },
        },
        orderBy,
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.task.count({ where }),
    ]);

    return createPaginatedResponse(tasks.map(mapTask), total, pagination);
  }

  // Backward compatible: return all tasks (but with optimized includes)
  const tasks = await prisma.task.findMany({
    where,
    include: {
      ...withTaskIncludes,
      _count: {
        select: { comments: true },
      },
    },
    orderBy,
    take: 100, // Safety limit to prevent loading thousands of tasks
  });

  return tasks.map(mapTask);
};

const getTaskById = async (prisma, taskId, currentUser) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: withTaskIncludes,
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  // All users (including admins) can only access tasks they created or are assigned to
  const assignedIds = task.assignments.map((assignment) => assignment.userId);
  const isCreator = task.createdById === currentUser.id;
  if (!assignedIds.includes(currentUser.id) && !isCreator) {
    throw new AppError('You do not have access to this task', 403);
  }

  const mapped = mapTask(task);
  return mapped;
};

const createTask = async (prisma, payload, currentUser, options = {}) => {
  const { locationId } = options;
  const assignments = Array.isArray(payload.assignedTo) ? payload.assignedTo : [];

  const task = await prisma.task.create({
    data: {
      title: payload.title,
      description: payload.description,
      taskType: normalize(payload.taskType) || 'INSTALLATION',
      priority: normalize(payload.priority) || 'MEDIUM',
      status: normalize(payload.status) || 'TODO',
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
      estimatedHours: payload.estimatedHours ?? 0,
      completionPercentage: payload.completionPercentage ?? 0,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      customerVehicle: payload.customerVehicle,
      createdById: currentUser.id,
      updatedById: currentUser.id,
      locationId: payload.locationId || locationId || null,
      products: payload.products?.length
        ? {
            create: payload.products.map((product) => ({
              productName: product.productName,
              sku: product.sku,
              quantity: product.quantity ?? 1,
            })),
          }
        : undefined,
      assignments: assignments.length
        ? {
            create: assignments.map((userId) => ({ userId })),
          }
        : undefined,
    },
    include: withTaskIncludes,
  });

  await Promise.all(
    assignments.map((userId) =>
      createNotification(prisma, {
        recipientId: userId,
        title: 'Task nou asignat',
        message: `Ai fost asignat la: ${payload.title}`,
        type: 'TASK',
        entityType: 'task',
        entityId: task.id,
      })
    )
  );

  // Send push notifications to assigned users
  try {
    await sendTaskNotification(task, 'created');
  } catch (pushError) {
    console.error('Failed to send push notifications for task creation:', pushError);
    // Don't fail if push notifications fail
  }

  const mapped = mapTask(task);
  broadcastTask('created', mapped);
  return mapped;
};

const updateTask = async (prisma, taskId, payload, currentUser) => {
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignments: true,
    },
  });

  if (!existing) {
    throw new AppError('Task not found', 404);
  }

  const isAdmin = currentUser.roles?.some((role) => role === 'admin' || role.role?.key === 'admin');
  const managerial = isManagerial(currentUser);
  const assignedIds = existing.assignments.map((assignment) => assignment.userId);
  const isCreator = existing.createdById === currentUser.id;

  // All users can only update tasks they created or are assigned to
  if (!assignedIds.includes(currentUser.id) && !isCreator) {
    throw new AppError('You do not have permission to update this task', 403);
  }

  // Admins and creators can update all fields, assignees can only update status and completion
  const allowedFields = (isAdmin || isCreator)
    ? payload
    : Object.fromEntries(
        Object.entries(payload).filter(([key]) => ['status', 'completionPercentage'].includes(key))
      );

  const data = {
    ...allowedFields,
    updatedById: currentUser.id,
  };

  if (data.status) {
    data.status = normalize(data.status);
  }
  if (data.priority) {
    data.priority = normalize(data.priority);
  }
  if (data.taskType) {
    data.taskType = normalize(data.taskType);
  }
  if (data.dueDate) {
    data.dueDate = new Date(data.dueDate);
  }

  if (managerial && Array.isArray(payload.assignedTo)) {
    data.assignments = {
      deleteMany: {},
      create: payload.assignedTo.map((userId) => ({ userId })),
    };
  }

  if (managerial && Array.isArray(payload.products)) {
    data.products = {
      deleteMany: {},
      create: payload.products.map((product) => ({
        productName: product.productName,
        sku: product.sku,
        quantity: product.quantity ?? 1,
      })),
    };
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data,
    include: withTaskIncludes,
  });

  // Send notifications if status changed
  if (data.status && data.status !== existing.status) {
    const statusLabels = {
      TODO: 'De facut',
      IN_PROGRESS: 'In lucru',
      COMPLETED: 'Finalizat',
    };

    const recipients = new Set([...assignedIds, existing.createdById]);
    recipients.delete(currentUser.id);

    await Promise.all(
      Array.from(recipients).map((recipientId) =>
        createNotification(prisma, {
          recipientId,
          title: 'Status task actualizat',
          message: `${currentUser.name || 'Un coleg'} a schimbat status-ul task-ului "${existing.title}" in ${statusLabels[data.status] || data.status}`,
          type: 'TASK',
          entityType: 'task',
          entityId: taskId,
        })
      )
    );

    // Send push notifications for status change
    try {
      await sendTaskNotification(updated, 'updated');
    } catch (pushError) {
      console.error('Failed to send push notifications for task update:', pushError);
      // Don't fail if push notifications fail
    }
  }

  const mapped = mapTask(updated);
  broadcastTask('updated', mapped);
  return mapped;
};

const addTaskComment = async (prisma, taskId, { text }, currentUser) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignments: true,
      createdBy: true,
    },
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  // All users can only comment on tasks they created or are assigned to
  const assignedIds = task.assignments.map((assignment) => assignment.userId);
  const isCreator = task.createdById === currentUser.id;

  if (!assignedIds.includes(currentUser.id) && !isCreator) {
    throw new AppError('You do not have permission to comment on this task', 403);
  }

  await prisma.taskComment.create({
    data: {
      taskId,
      authorId: currentUser.id,
      text,
    },
  });

  const recipients = new Set([...assignedIds, task.createdById]);
  recipients.delete(currentUser.id);

  await Promise.all(
    Array.from(recipients).map((recipientId) =>
      createNotification(prisma, {
        recipientId,
        title: 'Comentariu nou la task',
        message: `${currentUser.name || 'Un coleg'} a comentat la ${task.title}`,
        type: 'TASK',
        entityType: 'task',
        entityId: task.id,
      })
    )
  );

  const refreshed = await prisma.task.findUnique({ where: { id: taskId }, include: withTaskIncludes });

  // Send push notifications for new comment
  try {
    await sendTaskNotification(refreshed, 'comment');
  } catch (pushError) {
    console.error('Failed to send push notifications for task comment:', pushError);
    // Don't fail if push notifications fail
  }

  const mapped = mapTask(refreshed);
  broadcastTask('updated', mapped);
  return mapped;
};

const getTaskComments = async (prisma, taskId, currentUser) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      createdById: true,
      assignments: {
        select: { userId: true },
      },
    },
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  // All users can only access tasks they created or are assigned to
  const assignedIds = task.assignments.map((a) => a.userId);
  const isCreator = task.createdById === currentUser.id;
  if (!assignedIds.includes(currentUser.id) && !isCreator) {
    throw new AppError('You do not have access to this task', 403);
  }

  // Fetch comments separately
  const comments = await prisma.taskComment.findMany({
    where: { taskId },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Map comments to match frontend expected format
  return comments.map((comment) => ({
    id: comment.id,
    _id: comment.id,
    text: comment.text,
    createdAt: comment.createdAt,
    user: {
      id: comment.author.id,
      _id: comment.author.id,
      firstName: comment.author.firstName,
      lastName: comment.author.lastName,
      email: comment.author.email,
    },
  }));
};

const deleteTask = async (prisma, taskId, currentUser) => {
  // Check if task exists and user has permission
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignments: true,
    },
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  const assignedIds = task.assignments.map((assignment) => assignment.userId);
  const isCreator = task.createdById === currentUser.id;
  const managerial = isManagerial(currentUser);

  // Only creators and managers can delete tasks
  if (!isCreator && !managerial) {
    throw new AppError('You do not have permission to delete this task', 403);
  }

  // Delete related records first (due to foreign key constraints)
  await prisma.$transaction([
    prisma.taskAssignment.deleteMany({ where: { taskId } }),
    prisma.taskProduct.deleteMany({ where: { taskId } }),
    prisma.taskComment.deleteMany({ where: { taskId } }),
    prisma.task.delete({ where: { id: taskId } }),
  ]);

  broadcastTask('deleted', { id: taskId, _id: taskId });
};

module.exports = {
  listTasks,
  getTaskById,
  createTask,
  updateTask,
  addTaskComment,
  getTaskComments,
  deleteTask,
};
