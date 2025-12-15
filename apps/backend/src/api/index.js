const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { ok } = require('../utils/http');
const tenantScope = require('../middleware/tenantScope');

const authRouter = require('./auth');
const organizationsRouter = require('./organizations');
const clientsRouter = require('./clients');
const assetsRouter = require('./assets');
const resourcesRouter = require('./resources');
const appointmentsRouter = require('./appointments');
const usersRouter = require('./users');
const tasksRouter = require('./tasks');
const personalTodosRouter = require('./personalTodos');
const leaveRequestsRouter = require('./leaveRequests');
const timeTrackingRouter = require('./timeTracking');
const notificationsRouter = require('./notifications');
const adminRouter = require('./admin');
const settingsRouter = require('./settings');
const invoicesRouter = require('./invoices');
const exportsRouter = require('./exports');
const pushNotificationsRouter = require('./pushNotifications');
const anafRouter = require('./anaf');
const paymentsRouter = require('./payments');

const router = express.Router();

router.get(
  '/health',
  asyncHandler(async (req, res) => {
    return ok(res, { timestamp: new Date().toISOString() }, 'ServiceFlow API is healthy');
  })
);

// Tenant scoping middleware - automatically filters queries by organizationId
// Must run after authenticate middleware in individual routes
router.use(tenantScope);

router.use('/auth', authRouter);
router.use('/organizations', organizationsRouter);
router.use('/clients', clientsRouter);
router.use('/assets', assetsRouter);
router.use('/resources', resourcesRouter);
router.use('/appointments', appointmentsRouter);
router.use('/users', usersRouter);
router.use('/tasks', tasksRouter);
router.use('/personal-todos', personalTodosRouter);
router.use('/leave-requests', leaveRequestsRouter);
router.use('/time-tracking', timeTrackingRouter);
router.use('/notifications', notificationsRouter);
router.use('/admin', adminRouter);
router.use('/settings', settingsRouter);
router.use('/invoices', invoicesRouter);
router.use('/exports', exportsRouter);
router.use('/push-notifications', pushNotificationsRouter);
router.use('/anaf', anafRouter);
router.use('/payments', paymentsRouter);

module.exports = router;
