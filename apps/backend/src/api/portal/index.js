const express = require('express');

const authRouter = require('./auth');
const appointmentsRouter = require('./appointments');
const invoicesRouter = require('./invoices');
const profileRouter = require('./profile');
const publicRouter = require('./public');
const marketplaceRouter = require('./marketplace');
const notificationsRouter = require('./notifications');
const websiteRouter = require('./website');
const loyaltyRouter = require('./loyalty');

const router = express.Router();

// Health check for portal
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'client-portal' });
});

// Public routes (no auth required)
router.use('/public/marketplace', marketplaceRouter);
router.use('/public', publicRouter);
router.use('/website', websiteRouter);

// Authenticated routes
router.use('/auth', authRouter);
router.use('/appointments', appointmentsRouter);
router.use('/invoices', invoicesRouter);
router.use('/profile', profileRouter);
router.use('/notifications', notificationsRouter);
router.use('/loyalty', loyaltyRouter);

module.exports = router;
