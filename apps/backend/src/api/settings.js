const express = require('express');
const { z } = require('zod');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { ok } = require('../utils/http');
const { getCompanySettings, updateCompanySettings } = require('../services/companySettingService');
const { validateVatNumber } = require('../services/vatValidationService');
const { AppError } = require('../utils/errors');
const { removeStoredLogo } = require('../utils/companyLogoStorage');
const { STORAGE_ROOT } = require('../utils/storage');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for logo uploads
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(STORAGE_ROOT, 'logos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `company-logo-${uniqueSuffix}${ext}`);
  },
});

const logoUpload = multer({
  storage: logoStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new AppError('Only image files are allowed (JPEG, PNG, GIF, SVG, WEBP)', 400));
  },
});

// Locked fields (set at signup): vatNumber, companyName, entityType - never accepted on PUT
const PHONE_REGEX = /^(\+?4?0\s?)?(2\d{2}|3\d{2}|7\d{2})\s?\d{3}\s?\d{3,4}$/;
const IBAN_REGEX = /^RO\d{2}[A-Z0-9]{22}$/i;
const SWIFT_REGEX = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/i;

const companySettingsSchema = z.object({
  legalName: z.string().max(160).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  email: z.string().email('Adresa de email nu este valida').optional().or(z.literal('')),
  phone: z
    .string()
    .max(30)
    .regex(PHONE_REGEX, 'Numarul de telefon nu este valid')
    .optional()
    .or(z.literal('')),
  contactPerson: z.string().max(120).optional().or(z.literal('')),
  website: z.string().url('URL-ul nu este valid').optional().or(z.literal('')),
  logoUrl: z.string().max(500).nullable().optional(),
  bankName: z.string().max(120).optional().or(z.literal('')),
  iban: z
    .string()
    .max(34)
    .regex(IBAN_REGEX, 'IBAN-ul nu este valid (format: RO49AAAA1234...)')
    .optional()
    .or(z.literal('')),
  swift: z
    .string()
    .max(11)
    .regex(SWIFT_REGEX, 'Codul SWIFT/BIC nu este valid')
    .optional()
    .or(z.literal('')),
  registrationNumber: z.string().max(60).optional().or(z.literal('')),
  cnp: z
    .string()
    .max(13)
    .regex(/^(\d{13})?$/, 'CNP-ul trebuie sa aiba 13 cifre')
    .optional()
    .or(z.literal('')),
  rampCount: z.number().int().min(1).max(999).optional(),
  tvaEnabled: z.boolean().optional(),
  tvaPercentage: z.number().min(0).max(100).optional(),
  footerNote: z.string().max(500).optional().or(z.literal('')),
  gdprNote: z.string().max(1200).optional().or(z.literal('')),
  additionalNote: z.string().max(1200).optional().or(z.literal('')),
});

router.get(
  '/company',
  authenticate,
  authorize({ roles: ['admin'] }),
  asyncHandler(async (req, res) => {
    const settings = await getCompanySettings(req.user.organizationId);
    return ok(res, settings);
  })
);

router.post(
  '/company/logo',
  authenticate,
  authorize({ roles: ['admin'] }),
  (req, res, next) => {
    logoUpload.single('logo')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return next(err);
        }
        return next(new AppError(err.message || 'File upload failed', 400));
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    // Delete old logo if it exists
    try {
      const currentSettings = await getCompanySettings(req.user.organizationId);
      if (currentSettings?.logoUrl) {
        await removeStoredLogo(currentSettings.logoUrl);
      }
    } catch (error) {
      logger.error('Failed to delete replaced company logo', error);
      // Continue anyway - not a critical error
    }

    const logoUrl = `/files/logos/${req.file.filename}`;

    return ok(res, { logoUrl }, 'Logo uploaded successfully');
  })
);

router.put(
  '/company',
  authenticate,
  authorize({ roles: ['admin'] }),
  validate(companySettingsSchema),
  asyncHandler(async (req, res) => {
    const settings = await updateCompanySettings(req.body, req.user);
    return ok(res, settings, 'Company settings updated');
  })
);

// VAT validation rate limiter - 10 requests per 15 minutes per user
const { getRedisClient } = require('../lib/redis');
const { RedisStore } = require('rate-limit-redis');

const makeVatRateLimitStore = () => {
  const client = getRedisClient();
  if (!client) return undefined;
  return new RedisStore({
    sendCommand: (...args) => client.call(...args),
    prefix: 'rl:vat-validate:',
  });
};

const vatValidationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Prea multe verificari. Incercati din nou peste cateva minute.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
  store: makeVatRateLimitStore(),
});

const vatValidationSchema = z.object({
  vatNumber: z.string().min(1).max(60),
});

router.post(
  '/validate-vat',
  authenticate,
  authorize({ roles: ['admin'] }),
  vatValidationLimiter,
  validate(vatValidationSchema),
  asyncHandler(async (req, res) => {
    const result = await validateVatNumber(req.body.vatNumber);
    return ok(res, result);
  })
);

module.exports = router;
