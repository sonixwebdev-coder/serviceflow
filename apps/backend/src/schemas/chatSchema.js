const { z } = require('zod');

/**
 * Validation schemas for chat endpoints
 */

// Channel creation schema
const createChannelSchema = z.object({
  name: z.string().min(1).max(100).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  type: z.enum(['PUBLIC', 'PRIVATE', 'DIRECT', 'GROUP']),
  memberIds: z.array(z.string()).optional().default([]),
});

// Channel update schema
const updateChannelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
});

// Add members schema
const addMembersSchema = z.object({
  userIds: z.array(z.string()).min(1),
});

// Update member role schema
const updateMemberRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
});

// List channels query schema
const listChannelsQuerySchema = z.object({
  type: z.enum(['PUBLIC', 'PRIVATE', 'DIRECT', 'GROUP']).optional(),
  archived: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
});

// List messages query schema
const listMessagesQuerySchema = z.object({
  limit: z.string().transform(Number).optional(),
  before: z.string().optional(),
  after: z.string().optional(),
});

// Create message schema
const createMessageSchema = z.object({
  body: z.string().min(1).max(10000),
  type: z.enum(['TEXT', 'FILE', 'VOICE', 'IMAGE']).optional().default('TEXT'),
  metadata: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional(),
});

// Update message schema
const updateMessageSchema = z.object({
  body: z.string().min(1).max(10000),
});

// Create DM schema
const createDMSchema = z.object({
  userId: z.string(),
});

// Create Group DM schema
const createGroupDMSchema = z.object({
  userIds: z.array(z.string()).min(2),
  name: z.string().min(1).max(100).optional().nullable(),
});

module.exports = {
  createChannelSchema,
  updateChannelSchema,
  addMembersSchema,
  updateMemberRoleSchema,
  listChannelsQuerySchema,
  listMessagesQuerySchema,
  createMessageSchema,
  updateMessageSchema,
  createDMSchema,
  createGroupDMSchema,
};
