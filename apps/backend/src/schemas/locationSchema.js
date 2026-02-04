const { z } = require('zod');

// Helper to transform empty strings to undefined for optional fields
const optionalString = (maxLength) =>
  z.string().max(maxLength).optional().transform((val) => (val === '' ? undefined : val));

const optionalEmail = () =>
  z.string().optional().transform((val) => (val === '' ? undefined : val))
    .pipe(z.string().email().optional());

const optionalSlug = () =>
  z.string().optional().transform((val) => (val === '' ? undefined : val))
    .pipe(z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional());

const operatingHoursSchema = z.object({
  monday: z.object({ open: z.string(), close: z.string(), closed: z.boolean().optional() }).optional(),
  tuesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean().optional() }).optional(),
  wednesday: z.object({ open: z.string(), close: z.string(), closed: z.boolean().optional() }).optional(),
  thursday: z.object({ open: z.string(), close: z.string(), closed: z.boolean().optional() }).optional(),
  friday: z.object({ open: z.string(), close: z.string(), closed: z.boolean().optional() }).optional(),
  saturday: z.object({ open: z.string(), close: z.string(), closed: z.boolean().optional() }).optional(),
  sunday: z.object({ open: z.string(), close: z.string(), closed: z.boolean().optional() }).optional(),
}).optional();

const baseLocationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: optionalSlug(),
  address: optionalString(255),
  city: optionalString(100),
  county: optionalString(100),
  country: z.string().length(2).default('RO').optional(),
  phone: optionalString(32),
  email: optionalEmail(),
  timezone: z.string().default('Europe/Bucharest').optional(),
  isActive: z.boolean().optional(),
  isPrimary: z.boolean().optional(),
  operatingHours: operatingHoursSchema,
  settings: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

const createLocationSchema = baseLocationSchema.extend({
  name: z.string().min(1).max(100),
});

const updateLocationSchema = baseLocationSchema.partial();

const listLocationQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const assignUsersSchema = z.object({
  userIds: z.array(z.string()).min(1),
  setPrimary: z.boolean().optional(),
});

const removeUsersSchema = z.object({
  userIds: z.array(z.string()).min(1),
});

module.exports = {
  createLocationSchema,
  updateLocationSchema,
  listLocationQuerySchema,
  assignUsersSchema,
  removeUsersSchema,
};
