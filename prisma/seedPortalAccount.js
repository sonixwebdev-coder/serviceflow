import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Creating test client portal account...\n');

  // Find an organization (use the first one or create a test one)
  let organization = await prisma.organization.findFirst();

  if (!organization) {
    console.log('Creating test organization...');
    organization = await prisma.organization.create({
      data: {
        name: 'Test Organization',
        slug: 'test-org',
      },
    });
    console.log('✓ Test organization created');
  } else {
    console.log(`✓ Using organization: ${organization.name}`);
  }

  // Find or create a test client
  let client = await prisma.client.findFirst({
    where: {
      organizationId: organization.id,
      email: 'client@test.com'
    },
  });

  if (!client) {
    console.log('Creating test client...');
    client = await prisma.client.create({
      data: {
        organization: { connect: { id: organization.id } },
        firstName: 'Test',
        lastName: 'Client',
        email: 'client@test.com',
        phone: '0722123456',
        type: 'PF',
        address: 'Strada Test 123, Bucuresti',
      },
    });
    console.log('✓ Test client created');
  } else {
    console.log(`✓ Using existing client: ${client.firstName} ${client.lastName}`);
  }

  // Check if account already exists
  const existingAccount = await prisma.clientAccount.findFirst({
    where: { clientId: client.id },
  });

  if (existingAccount) {
    console.log('\n⚠️  Client account already exists!');
    console.log(`   Email: ${existingAccount.email}`);
    console.log('   Password: Client123! (if unchanged)\n');
    return;
  }

  // Create client portal account
  console.log('Creating client portal account...');
  const hashedPassword = await bcrypt.hash('Client123!', 10);

  const clientAccount = await prisma.clientAccount.create({
    data: {
      clientId: client.id,
      email: 'client@test.com',
      password: hashedPassword,
      isVerified: true, // Pre-verified for testing
    },
  });

  console.log('✓ Client portal account created!\n');
  console.log('📋 Portal Credentials:');
  console.log('   Email:    client@test.com');
  console.log('   Password: Client123!');
  console.log('\n🔗 Portal URL: http://localhost:5174');
  console.log('\n✅ Done!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
