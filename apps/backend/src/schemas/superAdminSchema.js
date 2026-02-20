const { z } = require('zod');

// ─── Shared ──────────────────────────────────────────────────────────────────

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Organizations ───────────────────────────────────────────────────────────

const orgListQuery = paginationSchema.extend({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'TRIAL', 'CANCELLED']).optional(),
  plan: z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
  sector: z.enum(['AUTOMOTIVE', 'BEAUTY', 'DIGITAL_SERVICES', 'HOME_SERVICES', 'IT_ELECTRONICS']).optional(),
  search: z.string().max(200).optional(),
});

const orgUpdate = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'TRIAL', 'CANCELLED']).optional(),
  plan: z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
  maxUsers: z.coerce.number().int().min(1).max(10000).optional(),
  maxClients: z.coerce.number().int().min(1).max(100000).optional(),
  maxAppointments: z.coerce.number().int().min(1).max(1000000).optional(),
}).strict();

// ─── Billing ─────────────────────────────────────────────────────────────────

const changePlan = z.object({
  plan: z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']),
}).strict();

// ─── Logs ────────────────────────────────────────────────────────────────────

const logQuery = paginationSchema.extend({
  level: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).optional(),
  category: z.enum(['REQUEST', 'AUTH', 'ERROR', 'SYSTEM', 'EMAIL', 'REALTIME']).optional(),
  search: z.string().max(200).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// ─── Platform Settings ──────────────────────────────────────────────────────

const platformSettingsUpdate = z.object({
  stripeSecretKey: z.string().max(500).optional(),
  stripePublishableKey: z.string().max(500).optional(),
  stripeWebhookSecret: z.string().max(500).optional(),
  priceStarterMonthly: z.string().max(200).optional(),
  priceStarterAnnual: z.string().max(200).optional(),
  priceProfessionalMonthly: z.string().max(200).optional(),
  priceProfessionalAnnual: z.string().max(200).optional(),
  priceEnterpriseMonthly: z.string().max(200).optional(),
  priceEnterpriseAnnual: z.string().max(200).optional(),
  displayPriceStarterMonthly: z.coerce.number().min(0).optional(),
  displayPriceStarterAnnual: z.coerce.number().min(0).optional(),
  displayPriceProfessionalMonthly: z.coerce.number().min(0).optional(),
  displayPriceProfessionalAnnual: z.coerce.number().min(0).optional(),
  displayPriceEnterpriseMonthly: z.coerce.number().min(0).optional(),
  displayPriceEnterpriseAnnual: z.coerce.number().min(0).optional(),
  trialDays: z.coerce.number().int().min(0).max(365).optional(),
}).strict();

module.exports = {
  paginationSchema,
  orgListQuery,
  orgUpdate,
  changePlan,
  logQuery,
  platformSettingsUpdate,
};
