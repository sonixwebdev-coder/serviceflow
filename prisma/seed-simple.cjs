const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create base roles
  const adminRole = await prisma.role.upsert({
    where: { key: 'admin' },
    update: {},
    create: {
      key: 'admin',
      name: 'Administrator',
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { key: 'manager' },
    update: {},
    create: {
      key: 'manager',
      name: 'Manager',
    },
  });

  const technicianRole = await prisma.role.upsert({
    where: { key: 'technician' },
    update: {},
    create: {
      key: 'technician',
      name: 'Tehnician',
    },
  });

  const salesRole = await prisma.role.upsert({
    where: { key: 'sales' },
    update: {},
    create: {
      key: 'sales',
      name: 'Vanzari',
    },
  });

  console.log('✅ Roles created');

  // Create test users
  const password = await bcrypt.hash('Admin123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      password: password,
      firstName: 'Admin',
      lastName: 'User',
      phoneNumber: '+40721234567',
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: adminRole.id,
    },
  });

  console.log('✅ Users created');
  console.log('');
  console.log('🎉 Seed complete!');
  console.log('');
  console.log('Login with: admin@test.com / Admin123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
