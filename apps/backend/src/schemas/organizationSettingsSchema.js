const { z } = require('zod');

/**
 * Schema for asset/resource terminology
 */
const terminologyItemSchema = z.object({
  singular: z.string().min(1).max(50).optional(),
  plural: z.string().min(1).max(50).optional(),
  identifier: z.string().min(1).max(50).optional(),
});

/**
 * Schema for complete terminology settings
 */
const terminologySchema = z.object({
  asset: terminologyItemSchema.optional(),
  resource: terminologyItemSchema.optional(),
});

/**
 * Schema for feature flags
 */
const featuresSchema = z.object({
  useAssets: z.boolean().optional(),
  useResources: z.boolean().optional(),
  requireAssetForAppointment: z.boolean().optional(),
});

/**
 * Schema for asset field configuration per asset type
 */
const assetTypeFieldConfigSchema = z.object({
  visibleFields: z.array(z.string()).optional(),
  requiredFields: z.array(z.string()).optional(),
  fieldLabels: z.record(z.string()).optional(), // { fieldKey: customLabel }
});

/**
 * Schema for asset field configurations
 * Keys are asset types (vehicle, appliance, hvac_unit, equipment, other)
 */
const assetFieldConfigSchema = z.record(assetTypeFieldConfigSchema).optional();

/**
 * Schema for updating organization settings
 */
const updateOrganizationSettingsSchema = z.object({
  terminology: terminologySchema.optional(),
  features: featuresSchema.optional(),
  assetFieldConfig: assetFieldConfigSchema.optional(),
});

module.exports = {
  terminologySchema,
  featuresSchema,
  assetFieldConfigSchema,
  updateOrganizationSettingsSchema,
};
