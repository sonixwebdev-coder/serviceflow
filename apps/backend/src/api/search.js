const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const asyncHandler = require('../middleware/asyncHandler');
const searchService = require('../services/searchService');

/**
 * GET /api/search
 * Global search across all entities
 * Query params: q (search term), limit, types (comma-separated)
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { q, limit, types } = req.query;

    const results = await searchService.globalSearch(req.prisma, {
      query: q,
      limit: limit ? parseInt(limit, 10) : 5,
      types,
    });

    res.json(results);
  })
);

/**
 * GET /api/search/quick-actions
 * Get quick actions for command palette
 */
router.get(
  '/quick-actions',
  authenticate,
  asyncHandler(async (req, res) => {
    const actions = searchService.getQuickActions();
    res.json(actions);
  })
);

/**
 * GET /api/search/navigation
 * Get navigation shortcuts for command palette
 */
router.get(
  '/navigation',
  authenticate,
  asyncHandler(async (req, res) => {
    const shortcuts = searchService.getNavigationShortcuts();
    res.json(shortcuts);
  })
);

/**
 * GET /api/search/clients
 * Search only clients
 */
router.get(
  '/clients',
  authenticate,
  asyncHandler(async (req, res) => {
    const { q, limit } = req.query;
    const results = await searchService.searchClients(
      req.prisma,
      q || '',
      limit ? parseInt(limit, 10) : 10
    );
    res.json(results);
  })
);

/**
 * GET /api/search/appointments
 * Search only appointments
 */
router.get(
  '/appointments',
  authenticate,
  asyncHandler(async (req, res) => {
    const { q, limit } = req.query;
    const results = await searchService.searchAppointments(
      req.prisma,
      q || '',
      limit ? parseInt(limit, 10) : 10
    );
    res.json(results);
  })
);

/**
 * GET /api/search/tasks
 * Search only tasks
 */
router.get(
  '/tasks',
  authenticate,
  asyncHandler(async (req, res) => {
    const { q, limit } = req.query;
    const results = await searchService.searchTasks(
      req.prisma,
      q || '',
      limit ? parseInt(limit, 10) : 10
    );
    res.json(results);
  })
);

/**
 * GET /api/search/invoices
 * Search only invoices
 */
router.get(
  '/invoices',
  authenticate,
  asyncHandler(async (req, res) => {
    const { q, limit } = req.query;
    const results = await searchService.searchInvoices(
      req.prisma,
      q || '',
      limit ? parseInt(limit, 10) : 10
    );
    res.json(results);
  })
);

/**
 * GET /api/search/users
 * Search only users
 */
router.get(
  '/users',
  authenticate,
  asyncHandler(async (req, res) => {
    const { q, limit } = req.query;
    const results = await searchService.searchUsers(
      req.prisma,
      q || '',
      limit ? parseInt(limit, 10) : 10
    );
    res.json(results);
  })
);

module.exports = router;
