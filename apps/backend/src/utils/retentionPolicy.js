/**
 * Data retention policies per subscription plan.
 * Values are days. 0 = unlimited (never delete).
 */

const RETENTION_DAYS = {
  logs: { FREE: 90, STARTER: 180, PROFESSIONAL: 365, ENTERPRISE: 0 },
  chat: { FREE: 90, STARTER: 180, PROFESSIONAL: 365, ENTERPRISE: 0 },
  messages: { FREE: 90, STARTER: 180, PROFESSIONAL: 365, ENTERPRISE: 0 },
  notifications: { FREE: 30, STARTER: 90, PROFESSIONAL: 180, ENTERPRISE: 0 },
  sessions: { FREE: 30, STARTER: 30, PROFESSIONAL: 30, ENTERPRISE: 30 },
  typing: { FREE: 1, STARTER: 1, PROFESSIONAL: 1, ENTERPRISE: 1 },
};

/**
 * Entity types that represent financial data — never deleted from audit logs.
 */
const FINANCIAL_AUDIT_ENTITY_TYPES = ['Invoice', 'Payment', 'ServiceOrder'];

/**
 * Get retention days for a data type and plan.
 * @param {string} dataType - logs | chat | messages | notifications | sessions | typing
 * @param {string} plan - FREE | STARTER | PROFESSIONAL | ENTERPRISE
 * @returns {number} Days (0 = unlimited)
 */
function getRetentionDays(dataType, plan) {
  const policyGroup = RETENTION_DAYS[dataType];
  if (!policyGroup) return 0;
  return policyGroup[plan] ?? policyGroup.FREE;
}

/**
 * Get the cutoff date for a data type and plan.
 * @returns {Date|null} null if unlimited
 */
function getCutoffDate(dataType, plan) {
  const days = getRetentionDays(dataType, plan);
  if (days === 0) return null;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return cutoff;
}

module.exports = {
  RETENTION_DAYS,
  FINANCIAL_AUDIT_ENTITY_TYPES,
  getRetentionDays,
  getCutoffDate,
};
