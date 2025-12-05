const { z } = require('zod');

// Allowed roles in the system (must match roleService.js)
const ALLOWED_ROLES = ['admin', 'manager', 'sales', 'technician'];

const listUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.string().optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

const employmentTypeSchema = z.enum(['full-time', 'part-time', 'contractor']).optional();

const roleSchema = z.string().refine(
  (value) => {
    const normalized = value.toLowerCase().replace(/\s+/g, '-');
    return ALLOWED_ROLES.includes(normalized);
  },
  {
    message: `Role must be one of: ${ALLOWED_ROLES.join(', ')}`,
  }
);

const baseUserSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phoneNumber: z.string().min(7).optional(),
  dateOfBirth: z.string().optional(),
  employmentType: employmentTypeSchema,
  hourlyRate: z.number().nonnegative().optional(),
  role: roleSchema.optional(),
});

const createUserSchema = baseUserSchema.extend({
  password: z.string().min(8),
  role: roleSchema,
});

const updateUserSchema = baseUserSchema
  .extend({
    password: z.string().min(8).optional(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'No fields provided for update',
  });

// Profile management schemas
const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name is too long').optional(),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name is too long').optional(),
  email: z.string().email('Invalid email format').max(255, 'Email is too long').optional(),
  phoneNumber: z.string().min(7, 'Phone number must be at least 7 characters').max(20, 'Phone number is too long').optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').max(128, 'Password is too long'),
  newPassword: z.string()
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'New password must not exceed 128 characters')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

module.exports = {
  listUsersQuerySchema,
  updateUserStatusSchema,
  createUserSchema,
  updateUserSchema,
  updateProfileSchema,
  changePasswordSchema,
};
