const { z } = require('zod');

const emailSchema = z.string().email().max(254);
const passwordSchema = z.string()
  .min(8, 'Parola trebuie sa aiba cel putin 8 caractere')
  .max(128, 'Parola nu poate depasi 128 caractere')
  .regex(/[a-zA-Z]/, 'Parola trebuie sa contina cel putin o litera')
  .regex(/[0-9]/, 'Parola trebuie sa contina cel putin o cifra');

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
  context: z.enum(['crm', 'admin']).optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Invalid reset token'),
  password: passwordSchema,
});

module.exports = {
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
