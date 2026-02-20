const { z } = require('zod');

const listOrganizationsSchema = z.object({
  search: z.string().max(200).optional(),
  sector: z.enum(['AUTOMOTIVE', 'BEAUTY', 'DIGITAL_SERVICES', 'HOME_SERVICES', 'IT_ELECTRONICS']).optional(),
  city: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(12),
});

module.exports = {
  listOrganizationsSchema,
};
