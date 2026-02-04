const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const asyncHandler = require('../middleware/asyncHandler');
const analyticsService = require('../services/analyticsService');

/**
 * GET /api/analytics/overview
 * Get dashboard overview metrics
 */
router.get(
  '/overview',
  authenticate,
  asyncHandler(async (req, res) => {
    const locationFilter = await req.getLocationFilter({ includeNull: true });
    const data = await analyticsService.getDashboardOverview(req.tenantPrisma, { locationFilter });
    res.json(data);
  })
);

/**
 * GET /api/analytics/revenue
 * Get revenue trends
 * Query params: startDate, endDate, groupBy (day|week|month)
 */
router.get(
  '/revenue',
  authenticate,
  asyncHandler(async (req, res) => {
    const { startDate, endDate, groupBy } = req.query;
    const locationFilter = await req.getLocationFilter({ includeNull: true });
    const data = await analyticsService.getRevenueTrends(req.tenantPrisma, {
      startDate,
      endDate,
      groupBy,
      locationFilter,
    });
    res.json(data);
  })
);

/**
 * GET /api/analytics/appointments
 * Get appointment statistics
 * Query params: startDate, endDate
 */
router.get(
  '/appointments',
  authenticate,
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const locationFilter = await req.getLocationFilter({ includeNull: true });
    const data = await analyticsService.getAppointmentStats(req.tenantPrisma, {
      startDate,
      endDate,
      locationFilter,
    });
    res.json(data);
  })
);

/**
 * GET /api/analytics/clients
 * Get client acquisition metrics
 * Query params: startDate, endDate, groupBy (day|week|month)
 */
router.get(
  '/clients',
  authenticate,
  asyncHandler(async (req, res) => {
    const { startDate, endDate, groupBy } = req.query;
    const locationFilter = await req.getLocationFilter({ includeNull: true });
    const data = await analyticsService.getClientAcquisition(req.tenantPrisma, {
      startDate,
      endDate,
      groupBy,
      locationFilter,
    });
    res.json(data);
  })
);

/**
 * GET /api/analytics/invoices/aging
 * Get invoice aging report
 */
router.get(
  '/invoices/aging',
  authenticate,
  asyncHandler(async (req, res) => {
    const data = await analyticsService.getInvoiceAging(req.tenantPrisma);
    res.json(data);
  })
);

/**
 * GET /api/analytics/locations/comparison
 * Get analytics comparison across all locations (admin/manager only)
 * Query params: startDate, endDate
 */
router.get(
  '/locations/comparison',
  authenticate,
  authorize({ roles: ['admin', 'manager'] }),
  asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const data = await analyticsService.getLocationComparison(req.tenantPrisma, {
      startDate,
      endDate,
    });
    res.json(data);
  })
);

/**
 * GET /api/analytics/clients/top
 * Get top clients by revenue
 * Query params: startDate, endDate, limit
 */
router.get(
  '/clients/top',
  authenticate,
  asyncHandler(async (req, res) => {
    const { startDate, endDate, limit } = req.query;
    const data = await analyticsService.getTopClients(req.tenantPrisma, {
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : 10,
    });
    res.json(data);
  })
);

module.exports = router;
