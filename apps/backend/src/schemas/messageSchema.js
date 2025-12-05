const { z } = require('zod');

const createMessageSchema = z.object({
  body: z.string().min(1),
  type: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

module.exports = {
  createMessageSchema,
};
