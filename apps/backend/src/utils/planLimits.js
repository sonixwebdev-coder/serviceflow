/**
 * Subscription plan limits configuration
 *
 * Defines the limits for each subscription tier
 */

const PLAN_LIMITS = {
  FREE: {
    maxLocations: 1,
    maxUsers: 2,
    maxClients: 50,
    maxAppointments: 50,
    maxWebsitePages: 1,
    removeBranding: false,
  },
  STARTER: {
    maxLocations: 1,
    maxUsers: 5,
    maxClients: 500,
    maxAppointments: 500,
    maxWebsitePages: 5,
    removeBranding: false,
  },
  PROFESSIONAL: {
    maxLocations: 3,
    maxUsers: 15,
    maxClients: 2000,
    maxAppointments: 5000,
    maxWebsitePages: 15,
    removeBranding: true,
  },
  ENTERPRISE: {
    maxLocations: Infinity,
    maxUsers: Infinity,
    maxClients: Infinity,
    maxAppointments: Infinity,
    maxWebsitePages: Infinity,
    removeBranding: true,
  },
};

/**
 * Get the limit for a specific feature based on plan
 * @param {string} plan - Subscription plan (FREE, STARTER, PROFESSIONAL, ENTERPRISE)
 * @param {string} feature - Feature name (maxLocations, maxUsers, etc.)
 * @returns {number} The limit for the feature
 */
function getPlanLimit(plan, feature) {
  const planConfig = PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
  return planConfig[feature] ?? 0;
}

/**
 * Check if an organization can add more of a feature
 * @param {string} plan - Subscription plan
 * @param {string} feature - Feature name
 * @param {number} currentCount - Current count of the feature
 * @returns {boolean} Whether the organization can add more
 */
function canAddMore(plan, feature, currentCount) {
  const limit = getPlanLimit(plan, feature);
  return currentCount < limit;
}

/**
 * Get all limits for a plan
 * @param {string} plan - Subscription plan
 * @returns {object} All limits for the plan
 */
function getAllPlanLimits(plan) {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
}

module.exports = {
  PLAN_LIMITS,
  getPlanLimit,
  canAddMore,
  getAllPlanLimits,
};
