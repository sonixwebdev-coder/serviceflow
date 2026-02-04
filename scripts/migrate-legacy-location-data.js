/**
 * Migration script to assign legacy data (null locationId) to primary location
 * Run with: node scripts/migrate-legacy-location-data.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting legacy data migration...\n');

  // Get all organizations
  const organizations = await prisma.organization.findMany({
    select: { id: true, name: true },
  });

  for (const org of organizations) {
    console.log(`\nProcessing organization: ${org.name}`);

    // Find the primary location for this organization
    const primaryLocation = await prisma.location.findFirst({
      where: {
        organizationId: org.id,
        isPrimary: true,
      },
    });

    if (!primaryLocation) {
      // Try to find any location
      const anyLocation = await prisma.location.findFirst({
        where: { organizationId: org.id },
      });

      if (!anyLocation) {
        console.log(`  ⚠ No locations found for this organization. Skipping.`);
        continue;
      }

      console.log(`  ⚠ No primary location found, using: ${anyLocation.name}`);
      primaryLocation.id = anyLocation.id;
      primaryLocation.name = anyLocation.name;
    } else {
      console.log(`  Primary location: ${primaryLocation.name}`);
    }

    // Migrate clients with null locationId
    const clientsUpdated = await prisma.client.updateMany({
      where: {
        organizationId: org.id,
        locationId: null,
      },
      data: {
        locationId: primaryLocation.id,
      },
    });
    console.log(`  ✓ Updated ${clientsUpdated.count} clients`);

    // Migrate tasks with null locationId
    const tasksUpdated = await prisma.task.updateMany({
      where: {
        organizationId: org.id,
        locationId: null,
      },
      data: {
        locationId: primaryLocation.id,
      },
    });
    console.log(`  ✓ Updated ${tasksUpdated.count} tasks`);

    // Migrate appointments with null locationId
    const appointmentsUpdated = await prisma.appointment.updateMany({
      where: {
        organizationId: org.id,
        locationId: null,
      },
      data: {
        locationId: primaryLocation.id,
      },
    });
    console.log(`  ✓ Updated ${appointmentsUpdated.count} appointments`);

    // Migrate time entries with null locationId
    const timeEntriesUpdated = await prisma.timeEntry.updateMany({
      where: {
        organizationId: org.id,
        locationId: null,
      },
      data: {
        locationId: primaryLocation.id,
      },
    });
    console.log(`  ✓ Updated ${timeEntriesUpdated.count} time entries`);
  }

  console.log('\n✅ Migration complete!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
