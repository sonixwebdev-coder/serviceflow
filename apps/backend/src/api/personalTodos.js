const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/authenticate');
const { z } = require('zod');
const {
  listPersonalTodos,
  getPersonalTodoById,
  createPersonalTodo,
  updatePersonalTodo,
  deletePersonalTodo,
  togglePersonalTodo,
} = require('../services/personalTodoService');
const { ok, created } = require('../utils/http');

const router = express.Router();

// Validation schemas
// Accept both uppercase and lowercase priority formats
const createPersonalTodoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().max(1000, 'Description is too long').optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
});

const updatePersonalTodoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long').optional(),
  description: z.string().max(1000, 'Description is too long').optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  isCompleted: z.boolean().optional(),
});

const listQuerySchema = z.object({
  isCompleted: z.enum(['true', 'false']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT', 'low', 'medium', 'high', 'urgent']).optional(),
});

// List all personal todos for current user
router.get(
  '/',
  authenticate,
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const todos = await listPersonalTodos(req.user.id, req.query);
    return ok(res, todos);
  })
);

// Get a single personal todo
router.get(
  '/:todoId',
  authenticate,
  asyncHandler(async (req, res) => {
    const todo = await getPersonalTodoById(req.params.todoId, req.user.id);
    return ok(res, todo);
  })
);

// Create a new personal todo
router.post(
  '/',
  authenticate,
  validate(createPersonalTodoSchema),
  asyncHandler(async (req, res) => {
    const todo = await createPersonalTodo(req.user.id, req.body);
    return created(res, todo, 'Todo created successfully');
  })
);

// Update a personal todo
router.patch(
  '/:todoId',
  authenticate,
  validate(updatePersonalTodoSchema),
  asyncHandler(async (req, res) => {
    const todoId = req.params.todoId;

    if (!todoId || todoId === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'Invalid todo ID provided',
      });
    }

    const todo = await updatePersonalTodo(todoId, req.user.id, req.body);
    return ok(res, todo, 'Todo updated successfully');
  })
);

// Delete a personal todo
router.delete(
  '/:todoId',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await deletePersonalTodo(req.params.todoId, req.user.id);
    return ok(res, result);
  })
);

// Toggle todo completion
router.post(
  '/:todoId/toggle',
  authenticate,
  asyncHandler(async (req, res) => {
    const todo = await togglePersonalTodo(req.params.todoId, req.user.id);
    return ok(res, todo, 'Todo status updated');
  })
);

module.exports = router;
