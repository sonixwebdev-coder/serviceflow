const express = require('express');
const { z } = require('zod');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { ok, created } = require('../utils/http');
const {
  listTimeOffRequests,
  createTimeOffRequest,
  approveTimeOffRequest,
  rejectTimeOffRequest,
  createMedicalLeave,
} = require('../services/timeOffService');
const {
  logFromRequest,
  ENTITY_TYPES,
  getActionDescription,
} = require('../services/auditLogService');

const listQuerySchema = z.object({
  status: z.string().optional(),
  employee: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const createSchema = z.object({
  leaveType: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().min(1),
});

const reviewSchema = z.object({
  reviewNotes: z.string().optional(),
});

const createMedicalLeaveSchema = z.object({
  employeeId: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  reason: z.string().min(1),
});

const router = express.Router();

router.get(
  '/',
  authenticate,
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    const requests = await listTimeOffRequests(req.tenantPrisma, req.query, req.user);
    return ok(res, requests);
  })
);

router.post(
  '/',
  authenticate,
  validate(createSchema),
  asyncHandler(async (req, res) => {
    const request = await createTimeOffRequest(req.tenantPrisma, req.body, req.user);

    await logFromRequest(req, {
      action: 'CREATE',
      entityType: ENTITY_TYPES.TIME_OFF,
      entityId: request.id,
      description: getActionDescription('CREATE', ENTITY_TYPES.TIME_OFF, req.body.leaveType),
      metadata: {
        leaveType: req.body.leaveType,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
      },
    });

    return created(res, request, 'Leave request submitted');
  })
);

router.put(
  '/:requestId/approve',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(reviewSchema),
  asyncHandler(async (req, res) => {
    const request = await approveTimeOffRequest(
      req.tenantPrisma,
      req.params.requestId,
      req.user,
      req.body || {}
    );

    await logFromRequest(req, {
      action: 'APPROVE',
      entityType: ENTITY_TYPES.TIME_OFF,
      entityId: request.id,
      description: getActionDescription('APPROVE', ENTITY_TYPES.TIME_OFF),
      metadata: { employeeId: request.employeeId },
    });

    return ok(res, request, 'Leave request approved');
  })
);

router.put(
  '/:requestId/reject',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(reviewSchema),
  asyncHandler(async (req, res) => {
    const request = await rejectTimeOffRequest(
      req.tenantPrisma,
      req.params.requestId,
      req.user,
      req.body || {}
    );

    await logFromRequest(req, {
      action: 'REJECT',
      entityType: ENTITY_TYPES.TIME_OFF,
      entityId: request.id,
      description: getActionDescription('REJECT', ENTITY_TYPES.TIME_OFF),
      metadata: { employeeId: request.employeeId },
    });

    return ok(res, request, 'Leave request rejected');
  })
);

// Create medical leave for an employee (admin-only)
router.post(
  '/medical',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(createMedicalLeaveSchema),
  asyncHandler(async (req, res) => {
    const request = await createMedicalLeave(req.tenantPrisma, req.body, req.user);

    await logFromRequest(req, {
      action: 'CREATE',
      entityType: ENTITY_TYPES.TIME_OFF,
      entityId: request.id,
      description: `Creat concediu medical pentru angajat`,
      metadata: {
        employeeId: req.body.employeeId,
        startDate: req.body.startDate,
        endDate: req.body.endDate,
      },
    });

    return created(res, request, 'Medical leave created');
  })
);

module.exports = router;
