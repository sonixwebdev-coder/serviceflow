/**
 * Export API Routes
 * Handles data export endpoints for all entities
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const validateRequest = require('../middleware/validateRequest');
const { AppError } = require('../utils/errors');
const {
  exportAppointments,
  exportInvoices,
  exportClients,
  exportUsers,
  exportLeaveRequests,
  exportTimeTracking,
  exportTasks,
  exportAllData,
} = require('../services/exportService');
const {
  exportAppointmentsSchema,
  exportInvoicesSchema,
  exportClientsSchema,
  exportUsersSchema,
  exportLeaveRequestsSchema,
  exportTimeTrackingSchema,
  exportTasksSchema,
} = require('../schemas/exportSchema');

const router = express.Router();

// Rate limiting for export endpoints (CRITICAL SECURITY - DoS prevention)
const exportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 export requests per window per user
  message: 'Too many export requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  // Use user ID if authenticated, otherwise IP address
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
});

/**
 * Middleware to extract user roles
 */
const extractUserRoles = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('User not authenticated', 401));
  }
  // Attach user roles to request for easy access
  req.userRoles = req.user.roles || [];
  next();
};

/**
 * Set response headers for file download with security headers
 */
const setDownloadHeaders = (res, filename, contentType) => {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
};

// Apply authentication to all routes FIRST
router.use(authenticate);
router.use(extractUserRoles);
// Then apply rate limiting AFTER authentication
router.use(exportLimiter);

/**
 * Export appointments
 * GET /api/exports/appointments?format=csv&startDate=2024-01-01&endDate=2024-12-31&status=completed
 */
router.get(
  '/appointments',
  validateRequest(exportAppointmentsSchema, 'query'),
  asyncHandler(async (req, res) => {
    const filters = {
      status: req.validated.status,
      clientId: req.validated.clientId,
      startDate: req.validated.startDate,
      endDate: req.validated.endDate,
      search: req.validated.search,
    };

    const result = await exportAppointments(
      req.validated.format,
      filters,
      req.user.id,
      req.userRoles
    );

    setDownloadHeaders(res, result.filename, result.contentType);
    return res.send(result.buffer);
  })
);

/**
 * Export invoices
 * GET /api/exports/invoices?format=excel&status=paid&startDate=2024-01-01
 */
router.get(
  '/invoices',
  validateRequest(exportInvoicesSchema, 'query'),
  asyncHandler(async (req, res) => {
    const filters = {
      status: req.validated.status,
      clientId: req.validated.clientId,
      startDate: req.validated.startDate,
      endDate: req.validated.endDate,
      search: req.validated.search,
    };

    const result = await exportInvoices(
      req.validated.format,
      filters,
      req.user.id,
      req.userRoles
    );

    setDownloadHeaders(res, result.filename, result.contentType);
    return res.send(result.buffer);
  })
);

/**
 * Export clients
 * GET /api/exports/clients?format=json&type=PF
 */
router.get(
  '/clients',
  validateRequest(exportClientsSchema, 'query'),
  asyncHandler(async (req, res) => {
    const filters = {
      type: req.validated.type,
      search: req.validated.search,
    };

    const result = await exportClients(
      req.validated.format,
      filters,
      req.user.id,
      req.userRoles
    );

    setDownloadHeaders(res, result.filename, result.contentType);
    return res.send(result.buffer);
  })
);

/**
 * Export users/employees
 * GET /api/exports/users?format=csv&isActive=true
 */
router.get(
  '/users',
  validateRequest(exportUsersSchema, 'query'),
  asyncHandler(async (req, res) => {
    const filters = {
      isActive: req.validated.isActive,
      employmentType: req.validated.employmentType,
      search: req.validated.search,
    };

    const result = await exportUsers(
      req.validated.format,
      filters,
      req.user.id,
      req.userRoles
    );

    setDownloadHeaders(res, result.filename, result.contentType);
    return res.send(result.buffer);
  })
);

/**
 * Export leave requests
 * GET /api/exports/leave-requests?format=pdf&status=approved
 */
router.get(
  '/leave-requests',
  validateRequest(exportLeaveRequestsSchema, 'query'),
  asyncHandler(async (req, res) => {
    const filters = {
      status: req.validated.status,
      leaveType: req.validated.leaveType,
      employeeId: req.validated.employeeId,
      startDate: req.validated.startDate,
      endDate: req.validated.endDate,
    };

    const result = await exportLeaveRequests(
      req.validated.format,
      filters,
      req.user.id,
      req.userRoles
    );

    setDownloadHeaders(res, result.filename, result.contentType);
    return res.send(result.buffer);
  })
);

/**
 * Export time tracking entries
 * GET /api/exports/time-tracking?format=excel&startDate=2024-11-01&endDate=2024-11-30
 */
router.get(
  '/time-tracking',
  validateRequest(exportTimeTrackingSchema, 'query'),
  asyncHandler(async (req, res) => {
    const filters = {
      employeeId: req.validated.employeeId,
      startDate: req.validated.startDate,
      endDate: req.validated.endDate,
    };

    const result = await exportTimeTracking(
      req.validated.format,
      filters,
      req.user.id,
      req.userRoles
    );

    setDownloadHeaders(res, result.filename, result.contentType);
    return res.send(result.buffer);
  })
);

/**
 * Export tasks
 * GET /api/exports/tasks?format=csv&status=completed&priority=high
 */
router.get(
  '/tasks',
  validateRequest(exportTasksSchema, 'query'),
  asyncHandler(async (req, res) => {
    const filters = {
      status: req.validated.status,
      priority: req.validated.priority,
      taskType: req.validated.taskType,
      search: req.validated.search,
    };

    const result = await exportTasks(
      req.validated.format,
      filters,
      req.user.id,
      req.userRoles
    );

    setDownloadHeaders(res, result.filename, result.contentType);
    return res.send(result.buffer);
  })
);

/**
 * Export all data as ZIP archive (admin only)
 * POST /api/exports/all-data
 */
router.post(
  '/all-data',
  asyncHandler(async (req, res) => {
    // Check if user is admin
    // req.userRoles is an array of strings from extractUserRoles middleware
    const roleKeys = req.userRoles.map(r => {
      if (typeof r === 'string') return r;
      return r.role?.key || r.key;
    }).filter(Boolean);

    const isAdmin = roleKeys.includes('admin');

    if (!isAdmin) {
      throw new AppError('Only administrators can export all data', 403);
    }

    const result = await exportAllData(req.user.id, req.userRoles);

    setDownloadHeaders(res, result.filename, result.contentType);
    return res.send(result.buffer);
  })
);

/**
 * Get available export formats
 * GET /api/exports/formats
 */
router.get(
  '/formats',
  asyncHandler(async (req, res) => {
    return res.json({
      success: true,
      data: {
        formats: [
          {
            key: 'csv',
            name: 'CSV',
            description: 'Comma-separated values (compatible cu Excel)',
            mimeType: 'text/csv',
          },
          {
            key: 'excel',
            name: 'Excel',
            description: 'Microsoft Excel (XLSX)',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          },
          {
            key: 'json',
            name: 'JSON',
            description: 'JavaScript Object Notation',
            mimeType: 'application/json',
          },
          {
            key: 'pdf',
            name: 'PDF',
            description: 'Portable Document Format',
            mimeType: 'application/pdf',
          },
        ],
      },
    });
  })
);

/**
 * Get available entities for export
 * GET /api/exports/entities
 */
router.get(
  '/entities',
  asyncHandler(async (req, res) => {
    const roleKeys = req.userRoles.map(r => r.role?.key).filter(Boolean);
    const isAdmin = roleKeys.includes('admin');
    const isManager = roleKeys.includes('manager');

    const entities = [
      {
        key: 'appointments',
        name: 'Programari',
        endpoint: '/api/exports/appointments',
        available: true,
      },
      {
        key: 'invoices',
        name: 'Facturi',
        endpoint: '/api/exports/invoices',
        available: true,
      },
      {
        key: 'clients',
        name: 'Clienti',
        endpoint: '/api/exports/clients',
        available: true,
      },
      {
        key: 'users',
        name: 'Angajati',
        endpoint: '/api/exports/users',
        available: true,
        restricted: !isAdmin && !isManager,
      },
      {
        key: 'leave-requests',
        name: 'Cereri Concediu',
        endpoint: '/api/exports/leave-requests',
        available: true,
        restricted: !isAdmin && !isManager,
      },
      {
        key: 'time-tracking',
        name: 'Pontaj',
        endpoint: '/api/exports/time-tracking',
        available: true,
        restricted: !isAdmin && !isManager,
      },
      {
        key: 'tasks',
        name: 'Sarcini',
        endpoint: '/api/exports/tasks',
        available: true,
        restricted: !isAdmin && !isManager,
      },
    ];

    return res.json({
      success: true,
      data: {
        entities,
        canExportAll: isAdmin,
      },
    });
  })
);

module.exports = router;
