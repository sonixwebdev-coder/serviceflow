const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const asyncHandler = require('../middleware/asyncHandler');
const emailService = require('../services/email/emailService');

/**
 * GET /api/emails/logs
 * Get email logs with pagination and filters
 */
router.get(
  '/logs',
  authenticate,
  authorize({ roles: ['admin', 'manager'] }),
  asyncHandler(async (req, res) => {
    const { page, limit, status, recipientEmail } = req.query;
    const data = await emailService.getEmailLogs(req.prisma, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      status,
      recipientEmail,
    });
    res.json(data);
  })
);

/**
 * GET /api/emails/templates
 * List all email templates
 */
router.get(
  '/templates',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const templates = await emailService.listTemplates(req.prisma);
    res.json(templates);
  })
);

/**
 * GET /api/emails/templates/:name
 * Get a specific template by name
 */
router.get(
  '/templates/:name',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const { name } = req.params;
    const template = await emailService.getOrCreateTemplate(req.prisma, {
      organizationId: req.user.organizationId,
      name,
    });
    res.json(template);
  })
);

/**
 * PUT /api/emails/templates/:name
 * Update or create a template
 */
router.put(
  '/templates/:name',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const { name } = req.params;
    const { subject, bodyHtml, bodyText, isActive } = req.body;

    const template = await emailService.updateTemplate(req.prisma, {
      organizationId: req.user.organizationId,
      name,
      subject,
      bodyHtml,
      bodyText,
      isActive,
    });

    res.json(template);
  })
);

/**
 * POST /api/emails/send
 * Send a custom email
 */
router.post(
  '/send',
  authenticate,
  authorize({ roles: ['admin', 'manager'] }),
  asyncHandler(async (req, res) => {
    const { to, subject, html, text, template, templateData, recipientType, recipientId } = req.body;

    if (!to) {
      return res.status(400).json({ error: 'Recipient email is required' });
    }

    if (!template && !subject) {
      return res.status(400).json({ error: 'Subject is required when not using a template' });
    }

    const emailLog = await emailService.sendEmail(req.prisma, {
      to,
      subject,
      html,
      text,
      template,
      templateData,
      recipientType,
      recipientId,
      organizationId: req.user.organizationId,
    });

    res.json(emailLog);
  })
);

/**
 * POST /api/emails/send-test
 * Send a test email using a template
 */
router.post(
  '/send-test',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const { template, to } = req.body;

    if (!template || !to) {
      return res.status(400).json({ error: 'Template name and recipient email are required' });
    }

    // Use sample data for testing
    const sampleData = {
      clientName: 'Client Test',
      date: new Date().toLocaleDateString('ro-RO'),
      time: '10:00',
      location: 'Strada Test 123',
      description: 'Descriere serviciu test',
      invoiceNumber: 'FACT-001',
      issueDate: new Date().toLocaleDateString('ro-RO'),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('ro-RO'),
      total: '500.00',
      companyName: 'ServiceFlow Test',
      companyPhone: '0721 123 456',
    };

    const emailLog = await emailService.sendEmail(req.prisma, {
      to,
      template,
      templateData: sampleData,
      recipientType: 'USER',
      recipientId: req.user.id,
      organizationId: req.user.organizationId,
    });

    res.json(emailLog);
  })
);

/**
 * GET /api/emails/logs/:id
 * Get a specific email log
 */
router.get(
  '/logs/:id',
  authenticate,
  authorize({ roles: ['admin', 'manager'] }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const log = await req.prisma.emailLog.findUnique({
      where: { id },
    });

    if (!log) {
      return res.status(404).json({ error: 'Email log not found' });
    }

    res.json(log);
  })
);

/**
 * POST /api/emails/resend/:id
 * Resend a failed email
 */
router.post(
  '/resend/:id',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const existingLog = await req.prisma.emailLog.findUnique({
      where: { id },
    });

    if (!existingLog) {
      return res.status(404).json({ error: 'Email log not found' });
    }

    if (existingLog.status === 'SENT') {
      return res.status(400).json({ error: 'Email was already sent successfully' });
    }

    const emailLog = await emailService.sendEmail(req.prisma, {
      to: existingLog.recipientEmail,
      subject: existingLog.subject,
      html: existingLog.body,
      template: null, // Use stored body directly
      recipientType: existingLog.recipientType,
      recipientId: existingLog.recipientId,
      organizationId: existingLog.organizationId,
    });

    res.json(emailLog);
  })
);

module.exports = router;
