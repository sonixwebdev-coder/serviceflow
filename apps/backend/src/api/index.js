const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { ok } = require('../utils/http');

const authRouter = require('./auth');
const clientsRouter = require('./clients');
const appointmentsRouter = require('./appointments');
const usersRouter = require('./users');
const tasksRouter = require('./tasks');
const personalTodosRouter = require('./personalTodos');
const leaveRequestsRouter = require('./leaveRequests');
// TEMPORARILY HIDDEN - DO NOT DELETE - Time tracking imports
// const timeTrackingRouter = require('./timeTracking');
const notificationsRouter = require('./notifications');
const adminRouter = require('./admin');
const settingsRouter = require('./settings');
// TEMPORARILY HIDDEN - DO NOT DELETE - Invoices imports
// const invoicesRouter = require('./invoices');
const exportsRouter = require('./exports');
const pushNotificationsRouter = require('./pushNotifications');
// TEMPORARILY HIDDEN - DO NOT DELETE - ANAF imports
// const anafRouter = require('./anaf');

const router = express.Router();

router.get(
  '/health',
  asyncHandler(async (req, res) => {
    return ok(res, { timestamp: new Date().toISOString() }, 'ViperX CRM API is healthy');
  })
);

router.use('/auth', authRouter);
router.use('/clients', clientsRouter);
router.use('/appointments', appointmentsRouter);
router.use('/users', usersRouter);
router.use('/tasks', tasksRouter);
router.use('/personal-todos', personalTodosRouter);
router.use('/leave-requests', leaveRequestsRouter);
// TEMPORARILY HIDDEN - DO NOT DELETE - Time tracking route
// router.use('/time-tracking', timeTrackingRouter);
router.use('/notifications', notificationsRouter);
router.use('/admin', adminRouter);
router.use('/settings', settingsRouter);
// TEMPORARILY HIDDEN - DO NOT DELETE - Invoices route
// router.use('/invoices', invoicesRouter);
router.use('/exports', exportsRouter);
router.use('/push-notifications', pushNotificationsRouter);
// TEMPORARILY HIDDEN - DO NOT DELETE - ANAF route
// router.use('/anaf', anafRouter);

module.exports = router;
