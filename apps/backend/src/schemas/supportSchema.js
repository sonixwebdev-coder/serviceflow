const { z } = require('zod');

const createTicket = z.object({
  subject: z.string().min(3).max(200),
  category: z.enum(['BUG', 'FEATURE_REQUEST', 'BILLING', 'GENERAL_QUESTION']),
  message: z.string().min(1).max(5000),
}).strict();

const updateTicket = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
}).strict();

const createMessage = z.object({
  content: z.string().min(1).max(5000),
}).strict();

const ticketListQuery = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  category: z.enum(['BUG', 'FEATURE_REQUEST', 'BILLING', 'GENERAL_QUESTION']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  search: z.string().max(200).optional(),
});

module.exports = {
  createTicket,
  updateTicket,
  createMessage,
  ticketListQuery,
};
