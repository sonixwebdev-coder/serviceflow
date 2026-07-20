const { z } = require('zod');

const invoiceLineItemSchema = z.object({
  name: z.string().min(1, 'Line item name is required'),
  description: z.string().nullable().optional(),
  quantity: z.number().positive('Quantity must be positive').optional().default(1),
  unitPrice: z.number().nonnegative('Unit price must be non-negative').optional().default(0),
  order: z.number().int().nonnegative().optional(),
});

const invoiceStatusEnum = z
  .string()
  .transform((val) => val.toUpperCase())
  .pipe(z.enum(['DRAFT', 'GENERATED', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']));

const createInvoiceSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required'),
  serviceOrderId: z.string().optional(),
  clientId: z.string().optional(),
  status: invoiceStatusEnum.optional(),
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date(),
  notes: z.string().optional(),
  tax: z.number().nonnegative().optional(),
  lineItems: z.array(invoiceLineItemSchema).min(1, 'At least one line item is required'),
});

const updateInvoiceSchema = z.object({
  status: invoiceStatusEnum.optional(),
  issueDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  tax: z.number().nonnegative().optional(),
  lineItems: z.array(invoiceLineItemSchema).optional(),
  applyLoyaltyDiscount: z.boolean().optional(),
});

const listInvoicesQuerySchema = z.object({
  status: z.string().optional(),
  clientId: z.string().optional(),
  issueDateFrom: z.string().datetime().optional(),
  issueDateTo: z.string().datetime().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['invoiceNumber', 'issueDate', 'dueDate', 'total', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

module.exports = {
  createInvoiceSchema,
  updateInvoiceSchema,
  listInvoicesQuerySchema,
};
