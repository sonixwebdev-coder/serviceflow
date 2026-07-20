const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const cache = require('../utils/cache');
const {
  createOrganization,
  getOrganizationById,
  updateOrganization,
  getOrganizationStats,
} = require('../services/organizationService');
const { setRefreshCookie } = require('../utils/cookies');
const {
  getOrganizationSettings,
  getSectorInfo,
  updatePublicBooking,
  getServices,
  updateServices,
  updateDescription,
} = require('../services/organizationSettingsService');
const {
  publicBookingSchema,
  servicesArraySchema,
} = require('../schemas/organizationSettingsSchema');
const { logFromRequest } = require('../services/auditLogService');
const { ok, created } = require('../utils/http');
const { validateCuiChecksum, validateVatNumber } = require('../services/vatValidationService');
const { isValidSector } = require('../constants/activitySectors');

const router = express.Router();

// ─── Rate Limiters ───────────────────────────────────────────────────────────

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 signup attempts per 15 min per IP
  message: 'Prea multe incercari de inregistrare. Incercati din nou in cateva minute.',
  standardHeaders: true,
  legacyHeaders: false,
});

const slugCheckLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: 'Too many slug check requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const vatValidationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: 'Prea multe cereri de verificare CUI. Incercati din nou in cateva minute.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Shared Validators ───────────────────────────────────────────────────────

const safeString = (maxLen = 500) =>
  z
    .string()
    .max(maxLen)
    .transform((s) => s.trim());

const emailSchema = z
  .string()
  .min(1, 'Email-ul este obligatoriu')
  .max(254)
  .email('Adresa de email nu este valida')
  .transform((s) => s.trim().toLowerCase());

const phoneSchema = z
  .string()
  .min(1, 'Numarul de telefon este obligatoriu')
  .max(20)
  .regex(
    /^(\+?4?0?\s?)?(2\d{2}|3\d{2}|7\d{2})\s?\d{3}\s?\d{3,4}$/,
    'Numarul de telefon nu este valid (format RO asteptat, ex: 0712345678 sau +40712345678)'
  )
  .transform((s) => s.replace(/\s+/g, ''));

const optionalPhoneSchema = z
  .string()
  .max(20)
  .regex(
    /^(\+?4?0?\s?)?(2\d{2}|3\d{2}|7\d{2})\s?\d{3}\s?\d{3,4}$/,
    'Numarul de telefon nu este valid (format RO asteptat, ex: 0712345678 sau +40712345678)'
  )
  .transform((s) => s.replace(/\s+/g, ''))
  .optional()
  .or(z.literal(''));

// ─── Signup Schema ───────────────────────────────────────────────────────────

const signupSchema = z
  .object({
    organizationName: safeString(200).pipe(
      z.string().min(2, 'Numele organizatiei trebuie sa aiba minim 2 caractere')
    ),
    slug: z
      .string()
      .min(3, 'Slug-ul trebuie sa aiba minim 3 caractere')
      .max(63, 'Slug-ul trebuie sa aiba maxim 63 caractere')
      .regex(/^[a-z0-9-]+$/, 'Slug-ul poate contine doar litere mici, cifre si cratime')
      .regex(/^[a-z0-9]/, 'Slug-ul trebuie sa inceapa cu o litera sau cifra')
      .regex(/[a-z0-9]$/, 'Slug-ul trebuie sa se termine cu o litera sau cifra')
      .refine((val) => !val.includes('--'), 'Slug-ul nu poate contine cratime consecutive'),
    email: emailSchema,
    password: z
      .string()
      .min(8, 'Parola trebuie sa aiba minim 8 caractere')
      .max(128, 'Parola poate avea maxim 128 caractere'),
    firstName: safeString(100).pipe(z.string().min(1, 'Prenumele este obligatoriu')),
    lastName: safeString(100).pipe(z.string().min(1, 'Numele este obligatoriu')),
    phoneNumber: optionalPhoneSchema,
    activitySector: z.string().refine((val) => isValidSector(val), {
      message: 'Domeniul de activitate este invalid',
    }),
    plan: z.enum(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']).default('PROFESSIONAL'),

    // Company profile fields
    vatNumber: safeString(20).pipe(z.string().min(1, 'CUI-ul este obligatoriu')),
    companyAddress: safeString(500).pipe(z.string().min(1, 'Adresa companiei este obligatorie')),
    companyEmail: emailSchema,
    companyPhone: phoneSchema,
    entityType: z.enum(['SRL', 'PFA'], {
      errorMap: () => ({ message: 'Tipul entitatii trebuie sa fie SRL sau PFA' }),
    }),
    registrationNumber: safeString(50).optional().or(z.literal('')),
    cnp: z
      .string()
      .max(13)
      .regex(/^(\d{13})?$/, 'CNP-ul trebuie sa aiba exact 13 cifre')
      .optional()
      .or(z.literal('')),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Server-side CUI checksum validation
    const checksumResult = validateCuiChecksum(data.vatNumber);
    if (!checksumResult.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: checksumResult.error,
        path: ['vatNumber'],
      });
    }
  });

// ─── Slug Check Schema ───────────────────────────────────────────────────────

const slugSchema = z.object({
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(63, 'Slug must be at most 63 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .regex(/^[a-z0-9]/, 'Slug must start with a letter or number')
    .regex(/[a-z0-9]$/, 'Slug must end with a letter or number')
    .refine((val) => !val.includes('--'), 'Slug cannot contain consecutive hyphens'),
});

/**
 * Organization signup endpoint
 * This is public - allows new organizations to register
 */
router.post(
  '/signup',
  signupLimiter,
  validate(signupSchema),
  asyncHandler(async (req, res) => {
    // Block authenticated super admins from creating orgs through the public signup
    // (which would issue a CRM refresh cookie and hijack their admin session)
    const authHeader = req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const { verifyAccessToken } = require('../utils/token');
        const payload = verifyAccessToken(authHeader.replace('Bearer ', ''));
        if (payload.type === 'admin') {
          return res.status(403).json({
            error: 'Conturile super admin nu pot folosi formularul public de inregistrare',
          });
        }
      } catch {
        // Invalid/expired token - proceed with signup as a public user
      }
    }

    const result = await createOrganization(req.body);
    setRefreshCookie(res, result.refreshToken);
    const { refreshToken: _rt, ...body } = result;
    return created(res, body, 'Organization created successfully');
  })
);

/**
 * Get current user's organization details
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const organization = await getOrganizationById(req.user.organizationId);
    return ok(res, organization);
  })
);

/**
 * Get current organization's statistics
 */
router.get(
  '/me/stats',
  authenticate,
  asyncHandler(async (req, res) => {
    const stats = await getOrganizationStats(req.user.organizationId);
    return ok(res, stats);
  })
);

/**
 * Get organization sector info (activity sector, asset type, terminology)
 */
router.get(
  '/me/sector',
  authenticate,
  asyncHandler(async (req, res) => {
    const sectorInfo = await getSectorInfo(req.tenantPrisma, req.user.organizationId);
    return ok(res, sectorInfo);
  })
);

/**
 * Update current user's organization
 * Only admins can update organization settings
 */
router.patch(
  '/me',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const organization = await updateOrganization(req.user.organizationId, req.body);

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: 'Organization',
      entityId: req.user.organizationId,
      description: `Actualizat setari organizatie`,
      metadata: { changes: Object.keys(req.body) },
    });

    return ok(res, organization, 'Organization updated successfully');
  })
);

/**
 * Get organization settings
 */
router.get(
  '/me/settings',
  authenticate,
  asyncHandler(async (req, res) => {
    const settings = await getOrganizationSettings(req.tenantPrisma, req.user.organizationId);
    return ok(res, settings);
  })
);

/**
 * Update public booking settings
 * Only admins can update public booking settings
 * This is the only editable settings after onboarding
 */
router.patch(
  '/me/settings/publicBooking',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(publicBookingSchema),
  asyncHandler(async (req, res) => {
    const settings = await updatePublicBooking(req.tenantPrisma, req.user.organizationId, req.body);

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: 'Organization',
      entityId: req.user.organizationId,
      description: `Actualizat setari programari publice`,
      metadata: req.body,
    });

    return ok(res, settings, 'Public booking settings updated successfully');
  })
);

/**
 * Get organization services
 */
router.get(
  '/me/settings/services',
  authenticate,
  asyncHandler(async (req, res) => {
    const services = await getServices(req.tenantPrisma, req.user.organizationId);
    return ok(res, services);
  })
);

/**
 * Update organization services
 * Only admins can update services
 */
router.put(
  '/me/settings/services',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(servicesArraySchema),
  asyncHandler(async (req, res) => {
    const services = await updateServices(
      req.tenantPrisma,
      req.user.organizationId,
      req.body.services
    );

    // Invalidate website CRM caches so the public website reflects changes immediately
    await cache.del(`website:crm:${req.user.organizationId}:services`);
    await cache.delPattern(`portal:crm:*:services`);

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: 'Organization',
      entityId: req.user.organizationId,
      description: `Actualizat servicii organizatie`,
      metadata: { servicesCount: req.body.services.length },
    });

    return ok(res, services, 'Services updated successfully');
  })
);

/**
 * Update organization description (shown in marketplace)
 * Only admins can update description
 */
router.patch(
  '/me/settings/description',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(z.object({ description: z.string().max(500).optional().default('') })),
  asyncHandler(async (req, res) => {
    const result = await updateDescription(
      req.tenantPrisma,
      req.user.organizationId,
      req.body.description
    );

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: 'Organization',
      entityId: req.user.organizationId,
      description: `Actualizat descriere organizatie`,
    });

    return ok(res, result, 'Description updated successfully');
  })
);

/**
 * Update invoice sequence settings
 * Only admins can configure invoice numbering
 */
router.patch(
  '/me/settings/invoiceSequence',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(
    z.object({
      prefix: z
        .string()
        .max(10)
        .regex(/^[A-Z0-9]*$/i, 'Only letters and numbers allowed')
        .optional(),
      separator: z.enum(['-', '/', '_', '']).optional(),
      includeYear: z.boolean().optional(),
      paddingDigits: z.number().int().min(3).max(10).optional(),
      startingNumber: z.number().int().min(1).optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const { AppError } = require('../utils/errors');
    const org = await req.tenantPrisma.organization.findUnique({
      where: { id: req.user.organizationId },
      select: { settings: true },
    });
    if (!org) throw new AppError('Organization not found', 404);

    const currentSeq = org.settings?.invoiceSequence || {};
    const now = new Date();

    // When startingNumber changes, snapshot the current invoice count so the
    // generator can offset correctly (startingNumber + invoicesSinceChange)
    let baseCountPatch = {};
    if (req.body.startingNumber !== undefined) {
      const year = now.getFullYear();
      const currentCount = await req.tenantPrisma.invoice.count({
        where: {
          issueDate: {
            gte: new Date(year, 0, 1),
            lt: new Date(year + 1, 0, 1),
          },
        },
      });
      baseCountPatch = { baseYear: year, baseCount: currentCount };
    }

    const updatedSeq = {
      ...currentSeq,
      ...req.body,
      ...baseCountPatch,
    };

    const updatedSettings = { ...(org.settings || {}), invoiceSequence: updatedSeq };
    await req.tenantPrisma.organization.update({
      where: { id: req.user.organizationId },
      data: { settings: updatedSettings },
    });

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: 'Organization',
      entityId: req.user.organizationId,
      description: 'Actualizat setari numerotare facturi',
      metadata: updatedSeq,
    });

    return ok(res, { invoiceSequence: updatedSeq }, 'Invoice sequence settings updated');
  })
);

/**
 * Update marketplace visibility (publicListing setting)
 * Only admins can toggle marketplace visibility
 */
router.patch(
  '/me/settings/publicListing',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(z.object({ publicListing: z.boolean() })),
  asyncHandler(async (req, res) => {
    const org = await req.tenantPrisma.organization.findUnique({
      where: { id: req.user.organizationId },
      select: { settings: true },
    });
    if (!org) throw new (require('../utils/errors').AppError)('Organization not found', 404);

    const updatedSettings = { ...(org.settings || {}), publicListing: req.body.publicListing };
    await req.tenantPrisma.organization.update({
      where: { id: req.user.organizationId },
      data: { settings: updatedSettings },
    });

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: 'Organization',
      entityId: req.user.organizationId,
      description: `Actualizat vizibilitate marketplace: ${req.body.publicListing ? 'vizibil' : 'ascuns'}`,
    });

    return ok(res, { publicListing: req.body.publicListing }, 'Marketplace visibility updated');
  })
);

/**
 * Self-deactivate organization (soft-delete by setting status to CANCELLED)
 * Only admins can do this
 */
router.post(
  '/me/deactivate',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const { AppError } = require('../utils/errors');
    const org = await req.tenantPrisma.organization.findUnique({
      where: { id: req.user.organizationId },
      select: { status: true },
    });
    if (!org) throw new AppError('Organization not found', 404);
    if (org.status === 'CANCELLED') throw new AppError('Organization is already deactivated', 400);

    await req.tenantPrisma.organization.update({
      where: { id: req.user.organizationId },
      data: { status: 'CANCELLED' },
    });

    await logFromRequest(req, {
      action: 'UPDATE',
      entityType: 'Organization',
      entityId: req.user.organizationId,
      description: 'Organizatie dezactivata de admin',
    });

    return ok(res, { status: 'CANCELLED' }, 'Organization deactivated');
  })
);

/**
 * Public VAT validation endpoint for signup flow
 * Validates CUI via ANAF/VIES before org creation
 */
router.post(
  '/validate-vat',
  vatValidationLimiter,
  validate(z.object({ vatNumber: z.string().min(1).max(60) })),
  asyncHandler(async (req, res) => {
    const result = await validateVatNumber(req.body.vatNumber);
    return ok(res, result);
  })
);

/**
 * Check if organization slug is available
 * This is public - allows checking slug availability during signup
 * Rate limited and includes timing attack prevention
 */
router.get(
  '/check-slug/:slug',
  slugCheckLimiter,
  validate(slugSchema, 'params'),
  asyncHandler(async (req, res) => {
    const prisma = require('../../lib/prisma');
    const { slug } = req.params;

    // Add random delay (50-100ms) to prevent timing attacks
    const delay = 50 + Math.random() * 50;
    await new Promise((resolve) => setTimeout(resolve, delay));

    const existing = await prisma.organization.findUnique({
      where: { slug },
    });

    return ok(res, {
      available: !existing,
      slug,
    });
  })
);

module.exports = router;
