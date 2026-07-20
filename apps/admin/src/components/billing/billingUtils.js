const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

export function isTrialExpiringWithinSevenDays(organization, now = new Date()) {
  if (!organization.trialEndsAt) return false;
  const daysLeft = Math.ceil((new Date(organization.trialEndsAt) - now) / DAY_IN_MILLISECONDS);
  return daysLeft >= 0 && daysLeft <= 7;
}
