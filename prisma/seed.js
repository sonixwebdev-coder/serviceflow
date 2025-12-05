import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create admin role
  console.log('Creating admin role...');
  const adminRole = await prisma.role.upsert({
    where: { key: 'admin' },
    update: {},
    create: {
      key: 'admin',
      name: 'Admin',
      description: 'Administrator with full system access',
    },
  });
  console.log('✓ Admin role created/verified');

  // Create technician role
  console.log('Creating technician role...');
  const technicianRole = await prisma.role.upsert({
    where: { key: 'technician' },
    update: {},
    create: {
      key: 'technician',
      name: 'Technician',
      description: 'Standard employee role',
    },
  });
  console.log('✓ Technician role created/verified');

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@viper.local' },
  });

  if (existingAdmin) {
    console.log('⚠️  Admin user already exists, skipping creation');
    console.log(`   Email: admin@viper.local`);
  } else {
    // Create default admin user
    console.log('Creating admin user...');
    const hashedPassword = await bcrypt.hash(
      'Admin123!',
      parseInt(process.env.HASH_SALT_ROUNDS || '10', 10)
    );

    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@viper.local',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        phoneNumber: '0000000000',
        employmentType: 'FULL_TIME',
        hireDate: new Date(),
        isActive: true,
        leaveBalanceVacation: 21,
        leaveBalanceSick: 15,
        leaveBalancePersonal: 5,
        roles: {
          create: {
            roleId: adminRole.id,
          },
        },
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    console.log('✓ Admin user created successfully!');
    console.log('\n📋 Admin Credentials:');
    console.log('   Email:    admin@viper.local');
    console.log('   Password: Admin123!');
    console.log('\n⚠️  IMPORTANT: Please change this password after your first login!\n');
  }

  console.log('✅ Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
