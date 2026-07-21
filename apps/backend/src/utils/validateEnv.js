const { z } = require('zod');

const envSchema = z
  .object({
    // ── Core (always required) ──
    DATABASE_URL: z
      .string({ error: 'DATABASE_URL is required' })
      .startsWith('postgresql://', 'DATABASE_URL must start with postgresql://'),
    JWT_ACCESS_SECRET: z
      .string({ error: 'JWT_ACCESS_SECRET is required' })
      .min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
    JWT_REFRESH_SECRET: z
      .string({ error: 'JWT_REFRESH_SECRET is required' })
      .min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
    CSRF_SECRET: z
      .string({ error: 'CSRF_SECRET is required' })
      .min(16, 'CSRF_SECRET must be at least 16 characters'),
    NODE_ENV: z.enum(['development', 'production', 'test'], {
      error: 'NODE_ENV is required',
    }),

    // ── Production-only (required when NODE_ENV=production) ──
    ENCRYPTION_KEY: z.string().min(32).optional(),
    CORS_ORIGINS: z.string().min(1).optional(),

    // ── URLs (optional in dev, validated in production superRefine) ──
    FRONTEND_URL: z.string().url().optional(),
    CLIENT_PORTAL_URL: z.string().url().optional(),
    WEBSITE_BASE_URL: z.string().url().optional(),
    WEBSITE_URL_TEMPLATE: z.string().includes('{subdomain}').optional(),
    API_BASE_URL: z.string().url().optional(),

    // ── Optional with defaults ──
    PORT: z.coerce.number().int().positive().default(5000),
    HASH_SALT_ROUNDS: z.coerce.number().int().min(4).max(20).default(12),
    REDIS_URL: z.string().url().optional(),

    // ── Optional integrations (validated only when set) ──
    STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
    STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_').optional(),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_').optional(),

    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    GOOGLE_REDIRECT_URI: z.string().url().optional(),

    SMTP_HOST: z.string().min(1).optional(),
    SMTP_PORT: z.coerce.number().int().positive().optional(),
    SMTP_USER: z.string().min(1).optional(),
    SMTP_PASSWORD: z.string().min(1).optional(),

    BREVO_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().email().optional(),
    EMAIL_FROM_NAME: z.string().min(1).optional(),

    FILE_STORAGE_ROOT: z.string().min(1).optional(),

    VAPID_PUBLIC_KEY: z.string().min(1).optional(),
    VAPID_PRIVATE_KEY: z.string().min(1).optional(),
    VAPID_SUBJECT: z.string().startsWith('mailto:').optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (!data.ENCRYPTION_KEY || data.ENCRYPTION_KEY.length < 32) {
        ctx.addIssue({
          path: ['ENCRYPTION_KEY'],
          code: z.ZodIssueCode.custom,
          message: 'ENCRYPTION_KEY is required in production (min 32 chars)',
        });
      }
      if (!data.CORS_ORIGINS) {
        ctx.addIssue({
          path: ['CORS_ORIGINS'],
          code: z.ZodIssueCode.custom,
          message: 'CORS_ORIGINS is required in production',
        });
      }
      if (!data.FRONTEND_URL) {
        ctx.addIssue({
          path: ['FRONTEND_URL'],
          code: z.ZodIssueCode.custom,
          message: 'FRONTEND_URL is required in production (used for email links and redirects)',
        });
      }
      if (!data.CLIENT_PORTAL_URL) {
        ctx.addIssue({
          path: ['CLIENT_PORTAL_URL'],
          code: z.ZodIssueCode.custom,
          message: 'CLIENT_PORTAL_URL is required in production (used for portal email links)',
        });
      }
      if (!data.WEBSITE_BASE_URL && !data.WEBSITE_URL_TEMPLATE) {
        ctx.addIssue({
          path: ['WEBSITE_BASE_URL'],
          code: z.ZodIssueCode.custom,
          message: 'WEBSITE_BASE_URL or WEBSITE_URL_TEMPLATE is required in production',
        });
      }
    }
  });

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('\n❌ Environment validation failed:\n');
    for (const issue of result.error.issues) {
      const field = issue.path.join('.');
      console.error(`  • ${field}: ${issue.message}`);
    }
    console.error('\nCheck your .env file and try again.\n');
    process.exit(1);
  }

  return result.data;
}

module.exports = validateEnv;
