const toApiLimit = (value) => (value === Infinity ? -1 : value);

const toDatabaseLimit = (value) => (value === Infinity ? 999999 : value);

const createBillingStatus = (organization) => ({
  plan: organization.plan,
  status: organization.status,
  trialEndsAt: organization.trialEndsAt,
  subscriptionId: organization.subscriptionId,
  subscriptionEndsAt: organization.subscriptionEndsAt,
  hasStripeCustomer: Boolean(organization.stripeCustomerId),
  planOverride: organization.planOverride || false,
  planOverrideReason: organization.planOverrideReason || null,
  planOverrideAt: organization.planOverrideAt || null,
  nextInvoice: null,
});

const applyStripeSubscription = (billingStatus, subscription) => {
  billingStatus.stripeStatus = subscription.status;
  billingStatus.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  billingStatus.cancelAtPeriodEnd = subscription.cancel_at_period_end;

  if (subscription.status === 'trialing') {
    billingStatus.trialEnd = new Date(subscription.trial_end * 1000);
  }
};

const applyUpcomingInvoice = (billingStatus, upcomingInvoice) => {
  billingStatus.nextInvoice = {
    amount: upcomingInvoice.amount_due / 100,
    currency: upcomingInvoice.currency,
    date: new Date(upcomingInvoice.next_payment_attempt * 1000),
  };
};

const applyUsageAndLimits = (billingStatus, counts, limits) => {
  billingStatus.usage = {
    users: { current: counts.userCount, max: toApiLimit(limits.maxUsers) },
    clients: { current: counts.clientCount, max: toApiLimit(limits.maxClients) },
    appointments: {
      current: counts.appointmentCount,
      max: toApiLimit(limits.maxAppointments),
    },
  };

  billingStatus.planLimits = {
    ...limits,
    maxLocations: toApiLimit(limits.maxLocations),
    maxUsers: toApiLimit(limits.maxUsers),
    maxClients: toApiLimit(limits.maxClients),
    maxAppointments: toApiLimit(limits.maxAppointments),
    maxWebsitePages: toApiLimit(limits.maxWebsitePages),
  };
};

const applyDisplayPrices = (billingStatus, settings) => {
  if (!settings) return;

  const toNumber = (value) => (value != null ? Number(value) : null);
  billingStatus.displayPrices = {
    STARTER: {
      monthly: toNumber(settings.displayPriceStarterMonthly),
      annual: toNumber(settings.displayPriceStarterAnnual),
    },
    PROFESSIONAL: {
      monthly: toNumber(settings.displayPriceProfessionalMonthly),
      annual: toNumber(settings.displayPriceProfessionalAnnual),
    },
    ENTERPRISE: {
      monthly: toNumber(settings.displayPriceEnterpriseMonthly),
      annual: toNumber(settings.displayPriceEnterpriseAnnual),
    },
  };
};

const getOrganizationStatus = (subscriptionStatus) => {
  switch (subscriptionStatus) {
    case 'trialing':
      return 'TRIAL';
    case 'active':
      return 'ACTIVE';
    case 'past_due':
      return 'PAYMENT_REQUIRED';
    case 'canceled':
    case 'unpaid':
      return 'CANCELLED';
    default:
      return 'ACTIVE';
  }
};

const buildSubscriptionUpdateData = (subscription, plan, limits) => {
  const updateData = {
    plan,
    status: getOrganizationStatus(subscription.status),
    subscriptionId: subscription.id,
    subscriptionEndsAt: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null,
    maxUsers: toDatabaseLimit(limits.maxUsers),
    maxClients: toDatabaseLimit(limits.maxClients),
    maxAppointments: toDatabaseLimit(limits.maxAppointments),
  };

  if (subscription.trial_end) {
    updateData.trialEndsAt = new Date(subscription.trial_end * 1000);
  }

  const interval = subscription.items?.data?.[0]?.price?.recurring?.interval;
  if (interval) {
    updateData.billingInterval = interval;
  }

  return updateData;
};

module.exports = {
  applyDisplayPrices,
  applyStripeSubscription,
  applyUpcomingInvoice,
  applyUsageAndLimits,
  buildSubscriptionUpdateData,
  createBillingStatus,
  getOrganizationStatus,
};
