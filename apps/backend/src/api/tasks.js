const express = require('express');
const { z } = require('zod');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { ok, created, noContent } = require('../utils/http');
const {
  listTasks,
  getTaskById,
  createTask,
  updateTask,
  addTaskComment,
  deleteTask,
} = require('../services/taskService');
const { logFromRequest, ENTITY_TYPES, getActionDescription } = require('../services/auditLogService');

const listQuerySchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  taskType: z.string().optional(),
  assignedTo: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const baseTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  taskType: z.string().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  assignedTo: z.array(z.string()).optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.number().nonnegative().optional(),
  completionPercentage: z.number().min(0).max(100).optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  customerVehicle: z.string().optional(),
  products: z
    .array(
      z.object({
        productName: z.string().min(1),
        sku: z.string().optional(),
        quantity: z.number().int().positive().optional(),
      })
    )
    .optional(),
});

const createTaskSchema = baseTaskSchema;
const updateTaskSchema = baseTaskSchema.partial();
const commentSchema = z.object({ text: z.string().min(1) });

const router = express.Router();

router.get(
  '/',
  authenticate,
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    // Enable pagination if page or limit is provided
    const paginate = Boolean(req.query.page || req.query.limit);
    const locationFilter = await req.getLocationFilter({ includeNull: true });
    const tasks = await listTasks(req.tenantPrisma, req.query, req.user, { paginate, locationFilter });
    return ok(res, tasks);
  })
);

router.get(
  '/:taskId',
  authenticate,
  asyncHandler(async (req, res) => {
    const task = await getTaskById(req.tenantPrisma, req.params.taskId, req.user);
    return ok(res, task);
  })
);

router.post(
  '/',
  authenticate,
  // Allow all authenticated users to create tasks
  validate(createTaskSchema),
  asyncHandler(async (req, res) => {
    const locationContext = await req.getLocationContext();
    const task = await createTask(req.tenantPrisma, req.body, req.user, {
      locationId: locationContext.currentLocationId,
    });

    await logFromRequest(req, {
      action: 'CREATE',
      entityType: ENTITY_TYPES.TASK,
      entityId: task.id,
      description: getActionDescription('CREATE', ENTITY_TYPES.TASK, task.title),
      metadata: { locationId: task.locationId },
    });

    return created(res, task, 'Task created successfully');
  })
);

router.put(
  '/:taskId',
  authenticate,
  validate(updateTaskSchema),
  asyncHandler(async (req, res) => {
    const task = await updateTask(req.tenantPrisma, req.params.taskId, req.body, req.user);

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: ENTITY_TYPES.TASK,
      entityId: task.id,
      description: getActionDescription('UPDATE', ENTITY_TYPES.TASK, task.title),
      metadata: { changes: Object.keys(req.body) },
    });

    return ok(res, task, 'Task updated successfully');
  })
);

router.get(
  '/:taskId/comments',
  authenticate,
  asyncHandler(async (req, res) => {
    const { getTaskComments } = require('../services/taskService');
    const comments = await getTaskComments(req.tenantPrisma, req.params.taskId, req.user);
    return ok(res, comments);
  })
);

router.post(
  '/:taskId/comments',
  authenticate,
  validate(commentSchema),
  asyncHandler(async (req, res) => {
    const task = await addTaskComment(req.tenantPrisma, req.params.taskId, req.body, req.user);
    return ok(res, task, 'Comment added successfully');
  })
);

router.delete(
  '/:taskId',
  authenticate,
  asyncHandler(async (req, res) => {
    const task = await getTaskById(req.tenantPrisma, req.params.taskId, req.user);
    await deleteTask(req.tenantPrisma, req.params.taskId, req.user);

    await logFromRequest(req, {
      action: 'DELETE',
      entityType: ENTITY_TYPES.TASK,
      entityId: req.params.taskId,
      description: getActionDescription('DELETE', ENTITY_TYPES.TASK, task.title),
    });

    return noContent(res);
  })
);

module.exports = router;
