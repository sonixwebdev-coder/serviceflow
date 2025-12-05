const express = require('express');
const { z } = require('zod');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const asyncHandler = require('../middleware/asyncHandler');
const authenticate = require('../middleware/authenticate');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { ok, created } = require('../utils/http');
const { getCompanySettings, updateCompanySettings } = require('../services/companySettingService');
const { AppError } = require('../utils/errors');

const router = express.Router();

// Configure multer for logo uploads
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../storage/logos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
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

const companySettingsSchema = z.object({
  companyName: z.string().max(120).optional(),
  legalName: z.string().max(160).optional(),
  address: z.string().max(320).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(60).optional(),
  website: z.string().url().optional(),
  logoUrl: z.string().max(500).nullable().optional(),
  vatNumber: z.string().max(60).optional(),
  registrationNumber: z.string().max(60).optional(),
  bankName: z.string().max(120).optional(),
  iban: z.string().max(40).optional(),
  swift: z.string().max(20).optional(),
  contactPerson: z.string().max(120).optional(),
  rampCount: z.number().int().min(1).optional(),
  footerNote: z.string().max(500).optional(),
  gdprNote: z.string().max(1200).optional(),
  additionalNote: z.string().max(1200).optional(),
});

router.get(
  '/company',
  authenticate,
  asyncHandler(async (req, res) => {
    const settings = await getCompanySettings();
    return ok(res, settings);
  })
);

router.post(
  '/company/logo',
  authenticate,
  authorize({ roles: ['admin'] }),
  logoUpload.single('logo'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    // Delete old logo if it exists
    try {
      const currentSettings = await getCompanySettings();
      if (currentSettings?.logoUrl) {
        const oldLogoPath = path.join(__dirname, '../..', currentSettings.logoUrl);
        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
        }
      }
    } catch (error) {
      console.error('Failed to delete old logo:', error);
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

module.exports = router;
