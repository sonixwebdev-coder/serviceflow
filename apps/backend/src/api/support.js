const express = require('express');
const authenticate = require('../middleware/authenticate');
const asyncHandler = require('../middleware/asyncHandler');
const validate = require('../middleware/validate');
const { ok, created } = require('../utils/http');
const { AppError } = require('../utils/errors');
const supportTicketService = require('../services/supportTicketService');
const { createTicket, createMessage, ticketListQuery } = require('../schemas/supportSchema');
const { broadcastSupportTicket, broadcastSupportMessage } = require('../realtime/events');

const router = express.Router();

router.use(authenticate);

// POST /support/tickets - Create ticket (admin only)
router.post(
  '/tickets',
  validate(createTicket, 'body'),
  asyncHandler(async (req, res) => {
    if (!req.user.roles.includes('admin')) {
      throw new AppError('Only admins can create support tickets', 403);
    }

    const ticket = await supportTicketService.createTicket({
      organizationId: req.user.organizationId,
      createdById: req.user.id,
      subject: req.body.subject,
      category: req.body.category,
      message: req.body.message,
    });

    broadcastSupportTicket('created', ticket);

    return created(res, ticket, 'Ticket created');
  })
);

// GET /support/tickets - List org tickets
router.get(
  '/tickets',
  validate(ticketListQuery, 'query'),
  asyncHandler(async (req, res) => {
    const result = await supportTicketService.listTickets({
      organizationId: req.user.organizationId,
      ...req.query,
    });

    return ok(res, result);
  })
);

// GET /support/tickets/:id - Ticket detail (verify org ownership)
router.get(
  '/tickets/:id',
  asyncHandler(async (req, res) => {
    const ticket = await supportTicketService.getTicket(req.params.id);

    if (ticket.organizationId !== req.user.organizationId) {
      throw new AppError('Ticket not found', 404);
    }

    return ok(res, ticket);
  })
);

// POST /support/tickets/:id/messages - Send message
router.post(
  '/tickets/:id/messages',
  validate(createMessage, 'body'),
  asyncHandler(async (req, res) => {
    const ticket = await supportTicketService.getTicket(req.params.id);

    if (ticket.organizationId !== req.user.organizationId) {
      throw new AppError('Ticket not found', 404);
    }

    const message = await supportTicketService.addMessage({
      ticketId: req.params.id,
      authorId: req.user.id,
      authorType: 'ORG_USER',
      content: req.body.content,
    });

    broadcastSupportMessage(ticket.organizationId, req.params.id, message);

    return created(res, message, 'Message sent');
  })
);

module.exports = router;
