#!/usr/bin/env node

/**
 * Create Super Admin CLI Script
 *
 * Creates a super admin user (no organization) with interactive prompts.
 *
 * Usage:
 *   node apps/backend/src/scripts/create-super-admin.js
 */

require('dotenv').config();
const readline = require('readline');
const bcrypt = require('bcryptjs');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (question) => new Promise((resolve) => rl.question(question, resolve));

const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const run = async () => {
  console.log('\n=== Create Super Admin ===\n');

  const email = await ask('Email: ');
  if (!validateEmail(email)) {
    console.error('Invalid email address.');
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.error(`User with email "${email}" already exists.`);
    process.exit(1);
  }

  const firstName = await ask('First name: ');
  if (!firstName.trim()) {
    console.error('First name is required.');
    process.exit(1);
  }

  const lastName = await ask('Last name: ');
  if (!lastName.trim()) {
    console.error('Last name is required.');
    process.exit(1);
  }

  const password = await ask('Password (min 8 chars): ');
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      isSuperAdmin: true,
      isActive: true,
      organizationId: null,
    },
  });

  console.log(`\nSuper admin created successfully!`);
  console.log(`  ID:    ${user.id}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Name:  ${user.firstName} ${user.lastName}`);
  console.log();
};

run()
  .catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  })
  .finally(async () => {
    rl.close();
    await prisma.$disconnect();
  });
