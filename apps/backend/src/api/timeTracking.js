const express = require('express');
const { z } = require('zod');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { ok, created, noContent } = require('../utils/http');
const {
  listTimeEntries,
  clockIn,
  clockOut,
  deleteTimeEntry,
} = require('../services/timeEntryService');
const { logFromRequest } = require('../services/auditLogService');

const listQuerySchema = z.object({
  employee: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const clockInSchema = z.object({
  schedule: z.string().optional(),
  clockInLocation: z.string().optional(),
});

const clockOutSchema = z.object({
  breakDuration: z.number().nonnegative().optional(),
  clockOutLocation: z.string().optional(),
});

const router = express.Router();

router.get(
  '/',
  authenticate,
  validate(listQuerySchema, 'query'),
  asyncHandler(async (req, res) => {
    // Enable pagination if page or limit is provided
    const paginate = Boolean(req.query.page || req.query.limit);
    const locationFilter = await req.getLocationFilter({ includeNull: true });
    const entries = await listTimeEntries(req.tenantPrisma, req.query, req.user, {
      paginate,
      locationFilter,
    });
    return ok(res, entries);
  })
);

router.post(
  '/clock-in',
  authenticate,
  validate(clockInSchema),
  asyncHandler(async (req, res) => {
    const locationContext = await req.getLocationContext();
    const entry = await clockIn(
      req.tenantPrisma,
      {
        ...req.body,
        locationId: locationContext.currentLocationId,
      },
      req.user
    );

    await logFromRequest(req, {
      action: 'CREATE',
      entityType: 'TimeEntry',
      entityId: entry.id,
      description: `Pontaj intrare`,
    });

    return created(res, entry, 'Clock-in recorded successfully');
  })
);

router.put(
  '/:entryId/clock-out',
  authenticate,
  validate(clockOutSchema),
  asyncHandler(async (req, res) => {
    const entry = await clockOut(req.tenantPrisma, req.params.entryId, req.body, req.user);

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: 'TimeEntry',
      entityId: entry.id,
      description: `Pontaj iesire`,
    });

    return ok(res, entry, 'Clock-out recorded successfully');
  })
);

router.delete(
  '/:entryId',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    await deleteTimeEntry(req.tenantPrisma, req.params.entryId);

    await logFromRequest(req, {
      action: 'DELETE',
      entityType: 'TimeEntry',
      entityId: req.params.entryId,
      description: `Sters pontaj`,
    });

    return noContent(res);
  })
);

module.exports = router;
