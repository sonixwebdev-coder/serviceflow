/**
 * Migration script to create default locations for existing organizations
 *
 * This script:
 * 1. Creates a default "Locatie Principala" location for each existing organization
 * 2. Assigns all users in each organization to their default location
 * 3. Sets locationId on all existing resources, appointments, schedules, and time entries
 *
 * Run this after the Prisma migration has been applied:
 * node scripts/migrate-default-locations.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function migrateDefaultLocations() {
  console.log('Starting default location migration...\n');

  // Get all organizations
  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  console.log(`Found ${organizations.length} organization(s) to process\n`);

  for (const org of organizations) {
    console.log(`\n=== Processing organization: ${org.name} (${org.id}) ===`);

    // Check if a location already exists for this organization
    const existingLocation = await prisma.location.findFirst({
      where: { organizationId: org.id },
    });

    if (existingLocation) {
      console.log(`  - Location already exists: ${existingLocation.name} (${existingLocation.id})`);
      console.log('  - Skipping organization\n');
      continue;
    }

    // Create default location
    const location = await prisma.location.create({
      data: {
        organizationId: org.id,
        name: 'Locatie Principala',
        slug: 'locatie-principala',
        isPrimary: true,
        isActive: true,
        timezone: 'Europe/Bucharest',
        country: 'RO',
      },
    });

    console.log(`  - Created default location: ${location.name} (${location.id})`);

    // Assign all users in the organization to the default location
    const users = await prisma.user.findMany({
      where: { organizationId: org.id },
      select: { id: true },
    });

    if (users.length > 0) {
      const userLocationData = users.map((user) => ({
        userId: user.id,
        locationId: location.id,
        isPrimary: true,
      }));

      await prisma.userLocation.createMany({
        data: userLocationData,
        skipDuplicates: true,
      });

      console.log(`  - Assigned ${users.length} user(s) to default location`);
    }

    // Update all resources to the default location
    const resourceResult = await prisma.resource.updateMany({
      where: {
        organizationId: org.id,
        locationId: null,
      },
      data: {
        locationId: location.id,
      },
    });

    console.log(`  - Updated ${resourceResult.count} resource(s) with default location`);

    // Update all appointments to the default location
    const appointmentResult = await prisma.appointment.updateMany({
      where: {
        organizationId: org.id,
        locationId: null,
      },
      data: {
        locationId: location.id,
      },
    });

    console.log(`  - Updated ${appointmentResult.count} appointment(s) with default location`);

    // Update all schedules to the default location
    const scheduleResult = await prisma.schedule.updateMany({
      where: {
        organizationId: org.id,
        locationId: null,
      },
      data: {
        locationId: location.id,
      },
    });

    console.log(`  - Updated ${scheduleResult.count} schedule(s) with default location`);

    // Update all time entries to the default location
    const timeEntryResult = await prisma.timeEntry.updateMany({
      where: {
        organizationId: org.id,
        locationId: null,
      },
      data: {
        locationId: location.id,
      },
    });

    console.log(`  - Updated ${timeEntryResult.count} time entry(ies) with default location`);
  }

  console.log('\n=== Migration completed successfully! ===\n');
}

migrateDefaultLocations()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
