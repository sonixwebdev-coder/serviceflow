const {
  applyDisplayPrices,
  applyStripeSubscription,
  applyUpcomingInvoice,
  applyUsageAndLimits,
  buildSubscriptionUpdateData,
  createBillingStatus,
  getOrganizationStatus,
} = require('../services/billing/billingDomain');

describe('billing domain helpers', () => {
  it('creates the public billing status with the existing defaults', () => {
    const status = createBillingStatus({
      plan: 'STARTER',
      status: 'ACTIVE',
      trialEndsAt: null,
      subscriptionId: null,
      subscriptionEndsAt: null,
      stripeCustomerId: '',
      planOverride: undefined,
      planOverrideReason: '',
      planOverrideAt: undefined,
    });

    expect(status).toEqual({
      plan: 'STARTER',
      status: 'ACTIVE',
      trialEndsAt: null,
      subscriptionId: null,
      subscriptionEndsAt: null,
      hasStripeCustomer: false,
      planOverride: false,
      planOverrideReason: null,
      planOverrideAt: null,
      nextInvoice: null,
    });
  });

  it('applies Stripe, usage, limit, invoice, and display-price transformations', () => {
    const status = {};

    applyStripeSubscription(status, {
      status: 'trialing',
      current_period_end: 1_800_000_000,
      cancel_at_period_end: true,
      trial_end: 1_750_000_000,
    });
    applyUpcomingInvoice(status, {
      amount_due: 12_345,
      currency: 'ron',
      next_payment_attempt: 1_760_000_000,
    });
    applyUsageAndLimits(
      status,
      { userCount: 3, clientCount: 40, appointmentCount: 120 },
      {
        maxLocations: 2,
        maxUsers: 5,
        maxClients: Infinity,
        maxAppointments: 500,
        maxWebsitePages: Infinity,
      }
    );
    applyDisplayPrices(status, {
      displayPriceStarterMonthly: '99.50',
      displayPriceStarterAnnual: '999',
      displayPriceProfessionalMonthly: null,
      displayPriceProfessionalAnnual: undefined,
      displayPriceEnterpriseMonthly: 499,
      displayPriceEnterpriseAnnual: 4990,
    });

    expect(status).toEqual({
      stripeStatus: 'trialing',
      currentPeriodEnd: new Date(1_800_000_000 * 1000),
      cancelAtPeriodEnd: true,
      trialEnd: new Date(1_750_000_000 * 1000),
      nextInvoice: {
        amount: 123.45,
        currency: 'ron',
        date: new Date(1_760_000_000 * 1000),
      },
      usage: {
        users: { current: 3, max: 5 },
        clients: { current: 40, max: -1 },
        appointments: { current: 120, max: 500 },
      },
      planLimits: {
        maxLocations: 2,
        maxUsers: 5,
        maxClients: -1,
        maxAppointments: 500,
        maxWebsitePages: -1,
      },
      displayPrices: {
        STARTER: { monthly: 99.5, annual: 999 },
        PROFESSIONAL: { monthly: null, annual: null },
        ENTERPRISE: { monthly: 499, annual: 4990 },
      },
    });
  });

  it.each([
    ['trialing', 'TRIAL'],
    ['active', 'ACTIVE'],
    ['past_due', 'PAYMENT_REQUIRED'],
    ['canceled', 'CANCELLED'],
    ['unpaid', 'CANCELLED'],
    ['incomplete', 'ACTIVE'],
  ])('maps Stripe status %s to organization status %s', (stripeStatus, organizationStatus) => {
    expect(getOrganizationStatus(stripeStatus)).toBe(organizationStatus);
  });

  it('builds the persisted subscription shape without absent optional values', () => {
    expect(
      buildSubscriptionUpdateData(
        {
          id: 'subscription-1',
          status: 'active',
          current_period_end: 0,
          trial_end: 0,
          items: { data: [{ price: {} }] },
        },
        'ENTERPRISE',
        {
          maxUsers: Infinity,
          maxClients: 100,
          maxAppointments: Infinity,
        }
      )
    ).toEqual({
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      subscriptionId: 'subscription-1',
      subscriptionEndsAt: null,
      maxUsers: 999999,
      maxClients: 100,
      maxAppointments: 999999,
    });
  });
});
