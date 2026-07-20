#!/usr/bin/env node

/**
 * One-time script to create Stripe Products & Prices for the configured platform plans.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_xxx node src/scripts/setupStripeProducts.js
 *
 * After running, copy the printed Price IDs into your .env (STRIPE_PRICE_*)
 * or directly into src/utils/stripePrices.js.
 */

require('dotenv').config();
const Stripe = require('stripe');
const { getPlatformConfig } = require('../config/platform');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

const platformName = getPlatformConfig().name;

const PLANS = [
  {
    plan: 'STARTER',
    name: `${platformName} Starter`,
    description: 'Tot ce ai nevoie ca solo operator sau micro-afacere.',
    monthlyPrice: 9900, // 99 RON in bani (smallest unit)
    annualPrice: 94800, // 79 RON * 12 = 948 RON
  },
  {
    plan: 'PROFESSIONAL',
    name: `${platformName} Profesional`,
    description: 'Pentru echipe in crestere si afaceri cu mai multe locatii.',
    monthlyPrice: 24900, // 249 RON
    annualPrice: 238800, // 199 RON * 12 = 2388 RON
  },
  {
    plan: 'ENTERPRISE',
    name: `${platformName} Enterprise`,
    description: 'Fara limite. Pentru lanturi de service si operatiuni mari.',
    monthlyPrice: 49900, // 499 RON
    annualPrice: 478800, // 399 RON * 12 = 4788 RON
  },
];

async function main() {
  console.log('Creating Stripe products and prices...\n');

  const results = {};

  for (const { plan, name, description, monthlyPrice, annualPrice } of PLANS) {
    // Create product
    const product = await stripe.products.create({
      name,
      description,
      metadata: { plan },
    });
    console.log(`Product: ${product.id}  (${name})`);

    // Monthly price
    const monthly = await stripe.prices.create({
      product: product.id,
      unit_amount: monthlyPrice,
      currency: 'ron',
      recurring: { interval: 'month' },
      metadata: { plan, interval: 'monthly' },
    });

    // Annual price
    const annual = await stripe.prices.create({
      product: product.id,
      unit_amount: annualPrice,
      currency: 'ron',
      recurring: { interval: 'year' },
      metadata: { plan, interval: 'annual' },
    });

    results[plan] = { monthly: monthly.id, annual: annual.id };

    console.log(`  Monthly: ${monthly.id}  (${monthlyPrice / 100} RON/mo)`);
    console.log(`  Annual:  ${annual.id}  (${annualPrice / 100} RON/yr)\n`);
  }

  console.log('--- Copy these into your .env ---\n');
  for (const [plan, prices] of Object.entries(results)) {
    console.log(`STRIPE_PRICE_${plan}_MONTHLY=${prices.monthly}`);
    console.log(`STRIPE_PRICE_${plan}_ANNUAL=${prices.annual}`);
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
