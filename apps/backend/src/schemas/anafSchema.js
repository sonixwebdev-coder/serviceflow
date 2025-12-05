const { z } = require('zod');

/**
 * Zod validation schemas for ANAF integration
 */

// ANAF Configuration schemas
const createAnafConfigSchema = z.object({
  companyId: z.string().cuid().optional(),
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client secret is required'),
  redirectUri: z.string().url('Invalid redirect URI'),
  cif: z.string().min(1, 'CIF (tax ID) is required').regex(/^RO?\d+$/, 'Invalid CIF format'),
  isActive: z.boolean().optional().default(true),
});

const updateAnafConfigSchema = z.object({
  clientId: z.string().min(1).optional(),
  clientSecret: z.string().min(1).optional(),
  redirectUri: z.string().url().optional(),
  cif: z.string().min(1).regex(/^RO?\d+$/).optional(),
  isActive: z.boolean().optional(),
});

// Company schemas
const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  vatNumber: z.string().min(1, 'VAT number is required'),
  registrationNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  country: z.string().length(2).optional().default('RO'),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  bankAccount: z.string().optional(),
  bankName: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

const updateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  vatNumber: z.string().min(1).optional(),
  registrationNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  county: z.string().optional(),
  country: z.string().length(2).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  bankAccount: z.string().optional(),
  bankName: z.string().optional(),
  isActive: z.boolean().optional(),
});

// OAuth callback schema
const oauthCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
  state: z.string().optional(),
  configId: z.string().cuid('Invalid config ID'),
});

// Invoice submission schemas
const submitInvoiceSchema = z.object({
  forceResubmit: z.boolean().optional().default(false),
});

const retryInvoiceSchema = z.object({
  maxRetries: z.number().int().min(1).max(10).optional(),
});

// Message listing schema
const listMessagesSchema = z.object({
  days: z.coerce.number().int().min(1).max(60).optional().default(7),
  filter: z.enum(['T', 'P', 'E', 'R']).optional().default('T'),
  cif: z.string().optional(),
});

// Sync status query schema
const syncStatusQuerySchema = z.object({
  invoiceId: z.string().cuid().optional(),
  status: z.enum(['PENDING', 'UPLOADING', 'UPLOADED', 'PROCESSING', 'OK', 'ERROR', 'REJECTED']).optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// Batch sync schema
const batchSyncSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  autoRetry: z.boolean().optional().default(false),
});

// Manual sync trigger schema
const triggerSyncSchema = z.object({
  syncType: z.enum(['status', 'messages', 'all']).optional().default('all'),
  days: z.coerce.number().int().min(1).max(60).optional().default(7),
});

// Download message schema
const downloadMessageSchema = z.object({
  messageId: z.string().min(1, 'Message ID is required'),
  downloadId: z.string().min(1, 'Download ID is required'),
});

// XML validation schema
const validateXmlSchema = z.object({
  invoiceId: z.string().cuid('Invalid invoice ID'),
});

module.exports = {
  createAnafConfigSchema,
  updateAnafConfigSchema,
  createCompanySchema,
  updateCompanySchema,
  oauthCallbackSchema,
  submitInvoiceSchema,
  retryInvoiceSchema,
  listMessagesSchema,
  syncStatusQuerySchema,
  batchSyncSchema,
  triggerSyncSchema,
  downloadMessageSchema,
  validateXmlSchema,
};
