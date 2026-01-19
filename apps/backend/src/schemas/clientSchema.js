const { z } = require('zod');

const baseClientSchema = z.object({
  type: z.enum(['PF', 'SRL']).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  companyName: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().min(7).max(32).optional(),
  email: z.string().email().optional(),
  vatNumber: z.string().optional(),
  registrationNumber: z.string().optional(),
  address: z.string().optional(),
  isOnline: z.boolean().optional(),
  fidelityCardSerie: z.string().optional(),
  notes: z.string().optional(),
});

const createClientSchema = baseClientSchema;

const updateClientSchema = baseClientSchema.partial();

const listClientQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  isOnline: z.enum(['true', 'false']).optional(),
});

module.exports = {
  createClientSchema,
  updateClientSchema,
  listClientQuerySchema,
};
