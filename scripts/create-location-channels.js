/**
 * Migration script to create chat channels for existing locations
 * Run with: node scripts/create-location-channels.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting location channel migration...');

  // Get all locations that don't have a chat channel yet
  const locations = await prisma.location.findMany({
    where: {
      chatChannels: {
        none: {
          type: 'LOCATION',
        },
      },
    },
    include: {
      organization: {
        include: {
          users: {
            where: {
              isActive: true,
              roles: {
                some: {
                  role: { key: 'admin' },
                },
              },
            },
            take: 1,
          },
        },
      },
    },
  });

  console.log(`Found ${locations.length} locations without chat channels.`);

  for (const location of locations) {
    const adminUser = location.organization.users[0];

    if (!adminUser) {
      console.log(`  Skipping ${location.name} - no admin user found in organization.`);
      continue;
    }

    try {
      const channel = await prisma.chatChannel.create({
        data: {
          organizationId: location.organizationId,
          locationId: location.id,
          name: location.name,
          description: `Canal de comunicare pentru locatia ${location.name}`,
          type: 'LOCATION',
          createdById: adminUser.id,
        },
      });

      // Add all users assigned to this location as members
      const userLocations = await prisma.userLocation.findMany({
        where: { locationId: location.id },
        select: { userId: true },
      });

      if (userLocations.length > 0) {
        await prisma.chatMember.createMany({
          data: userLocations.map((ul) => ({
            channelId: channel.id,
            userId: ul.userId,
            role: 'MEMBER',
          })),
          skipDuplicates: true,
        });
      }

      // Add the admin as owner if not already a member
      await prisma.chatMember.upsert({
        where: {
          channelId_userId: {
            channelId: channel.id,
            userId: adminUser.id,
          },
        },
        create: {
          channelId: channel.id,
          userId: adminUser.id,
          role: 'OWNER',
        },
        update: {
          role: 'OWNER',
        },
      });

      console.log(`  Created channel for ${location.name} with ${userLocations.length} members.`);
    } catch (error) {
      console.error(`  Error creating channel for ${location.name}:`, error.message);
    }
  }

  console.log('Migration complete!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
