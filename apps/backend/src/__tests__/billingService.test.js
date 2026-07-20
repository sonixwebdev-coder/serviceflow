const billingService = require('../services/billingService');
const prisma = require('../../lib/prisma');
const { getStripe } = require('../utils/stripe');
const { getPlanFromPriceId } = require('../utils/stripePrices');
const { getSettings } = require('../services/platformSettingsService');
const { getAllPlanLimits } = require('../utils/planLimits');
const {
  sendOrgSuspendedEmail,
  sendPaymentRequiredEmail,
} = require('../services/email/emailService');
const cache = require('../utils/cache');

jest.mock('../../lib/prisma', () => ({
  appointment: { count: jest.fn() },
  client: { count: jest.fn() },
  organization: { findUnique: jest.fn(), update: jest.fn() },
  user: { count: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
}));

jest.mock('../utils/stripe', () => ({
  getStripe: jest.fn(),
}));

jest.mock('../utils/stripePrices', () => ({
  getStripePriceId: jest.fn(),
  getPlanFromPriceId: jest.fn(),
}));

jest.mock('../services/platformSettingsService', () => ({
  getSettings: jest.fn(),
}));

jest.mock('../utils/planLimits', () => ({
  getAllPlanLimits: jest.fn(),
}));

jest.mock('../services/email/emailService', () => ({
  sendOrgSuspendedEmail: jest.fn(),
  sendPaymentRequiredEmail: jest.fn(),
}));

jest.mock('../utils/cache', () => ({
  del: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('billingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cache.del.mockResolvedValue(undefined);
  });

  it('returns the existing billing response shape with Stripe, usage, limits, and prices', async () => {
    const subscription = {
      status: 'trialing',
      current_period_end: 1_800_000_000,
      cancel_at_period_end: false,
      trial_end: 1_750_000_000,
    };
    const upcoming = {
      amount_due: 12_345,
      currency: 'ron',
      next_payment_attempt: 1_760_000_000,
    };
    getStripe.mockResolvedValue({
      subscriptions: { retrieve: jest.fn().mockResolvedValue(subscription) },
      invoices: { retrieveUpcoming: jest.fn().mockResolvedValue(upcoming) },
    });
    prisma.user.count.mockResolvedValue(3);
    prisma.client.count.mockResolvedValue(40);
    prisma.appointment.count.mockResolvedValue(120);
    getAllPlanLimits.mockReturnValue({
      maxLocations: 2,
      maxUsers: 5,
      maxClients: Infinity,
      maxAppointments: 500,
      maxWebsitePages: 10,
      removeBranding: false,
    });
    getSettings.mockResolvedValue({
      displayPriceStarterMonthly: '99.50',
      displayPriceStarterAnnual: '999',
      displayPriceProfessionalMonthly: '249',
      displayPriceProfessionalAnnual: '2490',
      displayPriceEnterpriseMonthly: null,
      displayPriceEnterpriseAnnual: null,
    });
    const org = {
      id: 'organization-1',
      plan: 'STARTER',
      status: 'TRIAL',
      trialEndsAt: new Date('2026-08-01T00:00:00.000Z'),
      subscriptionId: 'subscription-1',
      subscriptionEndsAt: null,
      stripeCustomerId: 'customer-1',
      planOverride: false,
    };

    const result = await billingService.getBillingStatus(org);

    expect(result).toMatchObject({
      plan: 'STARTER',
      status: 'TRIAL',
      subscriptionId: 'subscription-1',
      hasStripeCustomer: true,
      planOverride: false,
      stripeStatus: 'trialing',
      currentPeriodEnd: new Date(1_800_000_000 * 1000),
      cancelAtPeriodEnd: false,
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
        maxWebsitePages: 10,
        removeBranding: false,
      },
      displayPrices: {
        STARTER: { monthly: 99.5, annual: 999 },
        PROFESSIONAL: { monthly: 249, annual: 2490 },
        ENTERPRISE: { monthly: null, annual: null },
      },
    });
  });

  it('creates and persists a Stripe customer using the organization administrator email', async () => {
    const stripe = {
      customers: { create: jest.fn().mockResolvedValue({ id: 'customer-new' }) },
    };
    getStripe.mockResolvedValue(stripe);
    prisma.user.findFirst.mockResolvedValue({ email: 'admin@example.com' });
    prisma.organization.update.mockResolvedValue({});
    const org = { id: 'organization-1', name: 'Example Org', slug: 'example-org' };

    const customerId = await billingService.getOrCreateStripeCustomer(org);

    expect(stripe.customers.create).toHaveBeenCalledWith({
      name: 'Example Org',
      email: 'admin@example.com',
      metadata: { organizationId: 'organization-1', slug: 'example-org' },
    });
    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: 'organization-1' },
      data: { stripeCustomerId: 'customer-new' },
    });
    expect(customerId).toBe('customer-new');
  });

  it('synchronizes Stripe subscription state and invalidates every organization user', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      planOverride: false,
      subscriptionId: 'subscription-1',
    });
    prisma.organization.update.mockResolvedValue({});
    prisma.user.findMany.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);
    getPlanFromPriceId.mockResolvedValue('PROFESSIONAL');
    getAllPlanLimits.mockReturnValue({
      maxUsers: 15,
      maxClients: Infinity,
      maxAppointments: Infinity,
    });
    const stripeSubscription = {
      id: 'subscription-1',
      status: 'past_due',
      current_period_end: 1_800_000_000,
      trial_end: 1_750_000_000,
      metadata: { organizationId: 'organization-1' },
      items: {
        data: [
          {
            price: {
              id: 'price-professional',
              recurring: { interval: 'year' },
            },
          },
        ],
      },
    };

    await billingService.syncSubscription(stripeSubscription);

    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: 'organization-1' },
      data: {
        plan: 'PROFESSIONAL',
        status: 'PAYMENT_REQUIRED',
        subscriptionId: 'subscription-1',
        subscriptionEndsAt: new Date(1_800_000_000 * 1000),
        maxUsers: 15,
        maxClients: 999999,
        maxAppointments: 999999,
        trialEndsAt: new Date(1_750_000_000 * 1000),
        billingInterval: 'year',
      },
    });
    expect(cache.del).toHaveBeenCalledTimes(2);
    expect(cache.del).toHaveBeenCalledWith('auth:user-1');
    expect(cache.del).toHaveBeenCalledWith('auth:user-2');
  });

  it('marks an organization payment-required before the final retry and emails its admin', async () => {
    const org = {
      id: 'organization-1',
      name: 'Example Org',
      planOverride: false,
    };
    prisma.organization.findUnique.mockResolvedValue(org);
    prisma.organization.update.mockResolvedValue({});
    prisma.user.findFirst.mockResolvedValue({
      email: 'admin@example.com',
      firstName: 'Ana',
      lastName: 'Pop',
    });
    prisma.user.findMany.mockResolvedValue([{ id: 'user-1' }]);
    sendPaymentRequiredEmail.mockResolvedValue(undefined);

    await billingService.handlePaymentFailed({
      subscription: 'subscription-1',
      customer: 'customer-1',
      attempt_count: 2,
    });

    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: 'organization-1' },
      data: { status: 'PAYMENT_REQUIRED' },
    });
    expect(cache.del).toHaveBeenCalledWith('auth:user-1');
    expect(sendPaymentRequiredEmail).toHaveBeenCalledWith({
      email: 'admin@example.com',
      userName: 'Ana Pop',
      organizationName: 'Example Org',
    });
  });

  it('suspends an organization on the final retry and emails its admin', async () => {
    const org = {
      id: 'organization-1',
      name: 'Example Org',
      planOverride: false,
    };
    prisma.organization.findUnique.mockResolvedValue(org);
    prisma.organization.update.mockResolvedValue({});
    prisma.user.findFirst.mockResolvedValue({
      email: 'admin@example.com',
      firstName: 'Ana',
      lastName: 'Pop',
    });
    prisma.user.findMany.mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]);
    sendOrgSuspendedEmail.mockResolvedValue(undefined);

    await billingService.handlePaymentFailed({
      subscription: 'subscription-1',
      customer: 'customer-1',
      attempt_count: 3,
    });

    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: 'organization-1' },
      data: { status: 'SUSPENDED' },
    });
    expect(cache.del).toHaveBeenCalledTimes(2);
    expect(cache.del).toHaveBeenCalledWith('auth:user-1');
    expect(cache.del).toHaveBeenCalledWith('auth:user-2');
    expect(sendOrgSuspendedEmail).toHaveBeenCalledWith({
      email: 'admin@example.com',
      userName: 'Ana Pop',
      organizationName: 'Example Org',
      reason: 'Plata nu a putut fi procesata dupa mai multe incercari.',
    });
  });

  it('removes a deleted subscription while retaining the organization plan and limits', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      planOverride: false,
      subscriptionId: 'subscription-1',
    });
    prisma.organization.update.mockResolvedValue({});
    prisma.user.findMany.mockResolvedValue([{ id: 'user-1' }]);

    await billingService.handleSubscriptionDeleted({
      id: 'subscription-1',
      metadata: { organizationId: 'organization-1' },
    });

    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: 'organization-1' },
      data: {
        status: 'PAYMENT_REQUIRED',
        subscriptionId: null,
        subscriptionEndsAt: expect.any(Date),
      },
    });
    expect(cache.del).toHaveBeenCalledWith('auth:user-1');
  });
});
