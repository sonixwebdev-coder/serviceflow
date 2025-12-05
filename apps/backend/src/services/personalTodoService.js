const prisma = require('../../lib/prisma');
const { AppError } = require('../utils/errors');
const { createNotification } = require('./notificationService');
const { mapPersonalTodo } = require('../utils/transform');

const normalize = (value) => (value ? value.toUpperCase().replace(/-/g, '_') : undefined);

/**
 * List personal todos for the current user
 */
const listPersonalTodos = async (userId, filters = {}) => {
  const { isCompleted, priority } = filters;

  const where = {
    userId,
  };

  if (isCompleted !== undefined) {
    where.isCompleted = isCompleted === 'true' || isCompleted === true;
  }

  if (priority) {
    where.priority = normalize(priority);
  }

  const todos = await prisma.personalTodo.findMany({
    where,
    orderBy: [
      { isCompleted: 'asc' },
      { dueDate: 'asc' },
      { priority: 'desc' },
      { createdAt: 'desc' },
    ],
  });

  return todos.map(mapPersonalTodo);
};

/**
 * Get a single personal todo by ID (for internal use)
 */
const getPersonalTodoByIdRaw = async (todoId, userId) => {
  const todo = await prisma.personalTodo.findUnique({
    where: { id: todoId },
  });

  if (!todo) {
    throw new AppError('Todo not found', 404);
  }

  // Ensure user can only access their own todos
  if (todo.userId !== userId) {
    throw new AppError('You do not have access to this todo', 403);
  }

  return todo;
};

/**
 * Get a single personal todo by ID (for API responses)
 */
const getPersonalTodoById = async (todoId, userId) => {
  const todo = await getPersonalTodoByIdRaw(todoId, userId);
  return mapPersonalTodo(todo);
};

/**
 * Create a new personal todo
 */
const createPersonalTodo = async (userId, data) => {
  const { title, description, priority, dueDate } = data;

  if (!title || title.trim().length === 0) {
    throw new AppError('Title is required', 400);
  }

  const todo = await prisma.personalTodo.create({
    data: {
      userId,
      title: title.trim(),
      description: description?.trim(),
      priority: normalize(priority) || 'MEDIUM',
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });

  return mapPersonalTodo(todo);
};

/**
 * Update a personal todo
 */
const updatePersonalTodo = async (todoId, userId, data) => {
  // Verify ownership
  const existing = await getPersonalTodoByIdRaw(todoId, userId);

  const updates = {};

  if (data.title !== undefined) {
    if (!data.title || data.title.trim().length === 0) {
      throw new AppError('Title cannot be empty', 400);
    }
    updates.title = data.title.trim();
  }

  if (data.description !== undefined) {
    updates.description = data.description?.trim() || null;
  }

  if (data.priority !== undefined) {
    updates.priority = normalize(data.priority);
  }

  if (data.dueDate !== undefined) {
    updates.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  }

  if (data.isCompleted !== undefined) {
    updates.isCompleted = data.isCompleted === true || data.isCompleted === 'true';
    // Set completedAt timestamp when marking as complete
    if (updates.isCompleted && !existing.isCompleted) {
      updates.completedAt = new Date();
    } else if (!updates.isCompleted) {
      updates.completedAt = null;
    }
  }

  const todo = await prisma.personalTodo.update({
    where: { id: todoId },
    data: updates,
  });

  return mapPersonalTodo(todo);
};

/**
 * Delete a personal todo
 */
const deletePersonalTodo = async (todoId, userId) => {
  // Verify ownership
  await getPersonalTodoByIdRaw(todoId, userId);

  await prisma.personalTodo.delete({
    where: { id: todoId },
  });

  return { message: 'Todo deleted successfully' };
};

/**
 * Toggle todo completion status
 */
const togglePersonalTodo = async (todoId, userId) => {
  const todo = await getPersonalTodoByIdRaw(todoId, userId);

  const updated = await prisma.personalTodo.update({
    where: { id: todoId },
    data: {
      isCompleted: !todo.isCompleted,
      completedAt: !todo.isCompleted ? new Date() : null,
    },
  });

  return mapPersonalTodo(updated);
};

/**
 * Check for overdue todos and send notifications
 * This should be called periodically (e.g., daily via cron job)
 */
const checkOverdueTodos = async () => {
  const now = new Date();

  // Find all incomplete todos that are overdue
  const overdueTodos = await prisma.personalTodo.findMany({
    where: {
      isCompleted: false,
      dueDate: {
        lt: now,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Send notifications for overdue todos
  const notifications = overdueTodos.map((todo) =>
    createNotification({
      recipientId: todo.userId,
      title: 'Reminder: Todo depasit termen',
      message: `Task-ul "${todo.title}" a depasit termenul limita.`,
      type: 'SYSTEM',
      entityType: 'personalTodo',
      entityId: todo.id,
    })
  );

  await Promise.all(notifications);

  return {
    checked: overdueTodos.length,
    notified: notifications.length,
  };
};

/**
 * Check for todos due soon (within 24 hours) and send reminders
 * This should be called periodically (e.g., hourly via cron job)
 */
const checkUpcomingTodos = async () => {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Find all incomplete todos due within 24 hours
  const upcomingTodos = await prisma.personalTodo.findMany({
    where: {
      isCompleted: false,
      dueDate: {
        gte: now,
        lte: tomorrow,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Send notifications for upcoming todos
  const notifications = upcomingTodos.map((todo) => {
    const hoursUntilDue = Math.round((new Date(todo.dueDate) - now) / (1000 * 60 * 60));
    return createNotification({
      recipientId: todo.userId,
      title: 'Reminder: Todo aproape de termen',
      message: `Task-ul "${todo.title}" expira in ${hoursUntilDue} ore.`,
      type: 'SYSTEM',
      entityType: 'personalTodo',
      entityId: todo.id,
    });
  });

  await Promise.all(notifications);

  return {
    checked: upcomingTodos.length,
    notified: notifications.length,
  };
};

module.exports = {
  listPersonalTodos,
  getPersonalTodoById,
  createPersonalTodo,
  updatePersonalTodo,
  deletePersonalTodo,
  togglePersonalTodo,
  checkOverdueTodos,
  checkUpcomingTodos,
};
