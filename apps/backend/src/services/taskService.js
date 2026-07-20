const { AppError } = require('../utils/errors');
const { mapTask } = require('../utils/transform');
const { broadcastTask } = require('../realtime/events');
const { optimizedTaskIncludes, minimalTaskIncludes } = require('../utils/optimizedIncludes');
const { createPaginatedResponse, parsePaginationParams } = require('../utils/pagination');
const { buildTaskWhere, getTaskAccess, isManagerial } = require('./task/taskAccess');
const { buildTaskCreateData, buildTaskUpdateData, mapTaskComments } = require('./task/taskDomain');
const {
  notifyTaskAssignees,
  notifyTaskComment,
  notifyTaskStatusChange,
  queueTaskAssignedEmails,
  sendTaskPushSafely,
} = require('./task/taskNotifications');

// Keep old includes for backward compatibility in single task fetch.
const withTaskIncludes = optimizedTaskIncludes;

const listTasks = async (prisma, filters = {}, currentUser, options = {}) => {
  const { locationFilter = {} } = options;
  const where = buildTaskWhere(filters, currentUser, { locationFilter });
  const orderBy = [{ dueDate: 'asc' }, { priority: 'desc' }];

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

  const tasks = await prisma.task.findMany({
    where,
    include: {
      ...withTaskIncludes,
      _count: {
        select: { comments: true },
      },
    },
    orderBy,
    take: 100,
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

  const { assignedIds, isCreator } = getTaskAccess(task, currentUser);
  if (!assignedIds.includes(currentUser.id) && !isCreator) {
    throw new AppError('You do not have access to this task', 403);
  }

  return mapTask(task);
};

const createTask = async (prisma, payload, currentUser, options = {}) => {
  const { assignments, data } = buildTaskCreateData(payload, currentUser, options.locationId);
  const task = await prisma.task.create({
    data,
    include: withTaskIncludes,
  });

  await notifyTaskAssignees(prisma, assignments, task, payload.title);
  await sendTaskPushSafely(task, 'created', 'creation');
  void queueTaskAssignedEmails(prisma, assignments, task, currentUser);

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
  const { assignedIds, isCreator } = getTaskAccess(existing, currentUser);

  if (!assignedIds.includes(currentUser.id) && !isCreator) {
    throw new AppError('You do not have permission to update this task', 403);
  }

  const data = buildTaskUpdateData(payload, currentUser, {
    canUpdateAllFields: isAdmin || isCreator,
    managerial,
  });
  const updated = await prisma.task.update({
    where: { id: taskId },
    data,
    include: withTaskIncludes,
  });

  if (data.status && data.status !== existing.status) {
    await notifyTaskStatusChange(prisma, existing, data.status, currentUser, assignedIds);
    await sendTaskPushSafely(updated, 'updated', 'update');
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

  const { assignedIds, isCreator } = getTaskAccess(task, currentUser);
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

  await notifyTaskComment(prisma, task, currentUser, assignedIds);

  const refreshed = await prisma.task.findUnique({
    where: { id: taskId },
    include: withTaskIncludes,
  });

  await sendTaskPushSafely(refreshed, 'comment', 'comment');

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

  const { assignedIds, isCreator } = getTaskAccess(task, currentUser);
  if (!assignedIds.includes(currentUser.id) && !isCreator) {
    throw new AppError('You do not have access to this task', 403);
  }

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

  return mapTaskComments(comments);
};

const deleteTask = async (prisma, taskId, currentUser) => {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignments: true,
    },
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  const { isCreator } = getTaskAccess(task, currentUser);
  const managerial = isManagerial(currentUser);
  if (!isCreator && !managerial) {
    throw new AppError('You do not have permission to delete this task', 403);
  }

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
