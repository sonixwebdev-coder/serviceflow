const express = require('express');
const rateLimit = require('express-rate-limit');
const asyncHandler = require('../middleware/asyncHandler');
const { ok } = require('../utils/http');
const platformSettingsService = require('../services/platformSettingsService');

const router = express.Router();

// Rate limit: 30 requests per minute per IP
const pricingLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: 'Prea multe cereri. Incercati din nou peste cateva secunde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * GET /api/pricing
 * Public endpoint - no authentication required.
 * Returns display prices configured by the super admin.
 * Only includes non-null values so the frontend knows to use fallbacks for the rest.
 */
router.get(
  '/',
  pricingLimiter,
  asyncHandler(async (req, res) => {
    const settings = await platformSettingsService.getSettings();

    const result = {};

    // Starter
    const starter = {};
    if (settings?.displayPriceStarterMonthly != null) starter.monthly = settings.displayPriceStarterMonthly;
    if (settings?.displayPriceStarterAnnual != null) starter.annual = settings.displayPriceStarterAnnual;
    if (Object.keys(starter).length > 0) result.starter = starter;

    // Professional
    const professional = {};
    if (settings?.displayPriceProfessionalMonthly != null) professional.monthly = settings.displayPriceProfessionalMonthly;
    if (settings?.displayPriceProfessionalAnnual != null) professional.annual = settings.displayPriceProfessionalAnnual;
    if (Object.keys(professional).length > 0) result.professional = professional;

    // Enterprise
    const enterprise = {};
    if (settings?.displayPriceEnterpriseMonthly != null) enterprise.monthly = settings.displayPriceEnterpriseMonthly;
    if (settings?.displayPriceEnterpriseAnnual != null) enterprise.annual = settings.displayPriceEnterpriseAnnual;
    if (Object.keys(enterprise).length > 0) result.enterprise = enterprise;

    return ok(res, result, 'Preturi preluate cu succes');
  })
);

module.exports = router;
