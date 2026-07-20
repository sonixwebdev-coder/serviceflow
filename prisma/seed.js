import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Permission Definitions ────────────────────────────────────────────
const PERMISSIONS = [
  // Appointments
  {
    key: 'appointments:read',
    name: 'Vizualizare programari',
    description: 'Poate vedea programarile',
  },
  {
    key: 'appointments:create',
    name: 'Creare programari',
    description: 'Poate crea programari noi',
  },
  {
    key: 'appointments:update',
    name: 'Editare programari',
    description: 'Poate edita programarile',
  },
  {
    key: 'appointments:delete',
    name: 'Stergere programari',
    description: 'Poate sterge programari',
  },
  // Clients
  { key: 'clients:read', name: 'Vizualizare clienti', description: 'Poate vedea lista de clienti' },
  { key: 'clients:write', name: 'Gestionare clienti', description: 'Poate crea/edita clienti' },
  // Invoices
  { key: 'invoices:read', name: 'Vizualizare facturi', description: 'Poate vedea facturile' },
  { key: 'invoices:write', name: 'Gestionare facturi', description: 'Poate crea/edita facturi' },
  // Analytics & Reports
  {
    key: 'analytics:read',
    name: 'Vizualizare rapoarte',
    description: 'Poate vedea rapoartele si analizele',
  },
  // Loyalty
  {
    key: 'loyalty:read',
    name: 'Vizualizare fidelizare',
    description: 'Poate vedea programul de fidelizare',
  },
  {
    key: 'loyalty:write',
    name: 'Gestionare fidelizare',
    description: 'Poate gestiona programul de fidelizare',
  },
  // Assets
  { key: 'assets:read', name: 'Vizualizare echipamente', description: 'Poate vedea echipamentele' },
  {
    key: 'assets:write',
    name: 'Gestionare echipamente',
    description: 'Poate crea/edita echipamente',
  },
  // Users
  {
    key: 'users:read',
    name: 'Vizualizare utilizatori',
    description: 'Poate vedea lista de utilizatori',
  },
  {
    key: 'users:write',
    name: 'Gestionare utilizatori',
    description: 'Poate crea/edita utilizatori',
  },
  // Settings
  {
    key: 'settings:read',
    name: 'Vizualizare setari',
    description: 'Poate vedea setarile companiei',
  },
  {
    key: 'settings:write',
    name: 'Gestionare setari',
    description: 'Poate modifica setarile companiei',
  },
  // Locations
  { key: 'locations:read', name: 'Vizualizare locatii', description: 'Poate vedea locatiile' },
  { key: 'locations:write', name: 'Gestionare locatii', description: 'Poate crea/edita locatii' },
  // Website builder
  { key: 'website:read', name: 'Vizualizare site', description: 'Poate vedea site-ul' },
  { key: 'website:write', name: 'Gestionare site', description: 'Poate edita site-ul' },
  // Audit logs
  {
    key: 'audit:read',
    name: 'Vizualizare activitate',
    description: 'Poate vedea jurnalul de activitate',
  },
  // Billing
  {
    key: 'billing:manage',
    name: 'Gestionare facturare',
    description: 'Poate gestiona abonamentul si plata',
  },
  // Integrations
  {
    key: 'integrations:manage',
    name: 'Gestionare integrari',
    description: 'Poate configura integrarile',
  },
  // Chat (everyone can chat)
  { key: 'chat:use', name: 'Utilizare chat', description: 'Poate folosi chat-ul intern' },
  // Time tracking & leave
  {
    key: 'timeoff:own',
    name: 'Concedii proprii',
    description: 'Poate gestiona propriile cereri de concediu',
  },
  {
    key: 'timeoff:manage',
    name: 'Gestionare concedii',
    description: 'Poate aproba/respinge cererile de concediu',
  },
];

// ─── Role → Permission Mappings ────────────────────────────────────────
const ROLE_PERMISSIONS = {
  admin: PERMISSIONS.map((p) => p.key), // Admin gets everything
  manager: [
    'appointments:read',
    'appointments:create',
    'appointments:update',
    'appointments:delete',
    'clients:read',
    'clients:write',
    'invoices:read',
    'invoices:write',
    'analytics:read',
    'loyalty:read',
    'loyalty:write',
    'assets:read',
    'assets:write',
    'users:read',
    'settings:read',
    'locations:read',
    'website:read',
    'website:write',
    'audit:read',
    'integrations:manage',
    'chat:use',
    'timeoff:own',
    'timeoff:manage',
  ],
  sales: [
    'appointments:read',
    'appointments:create',
    'appointments:update',
    'clients:read',
    'clients:write',
    'invoices:read',
    'invoices:write',
    'assets:read',
    'assets:write',
    'analytics:read',
    'chat:use',
    'timeoff:own',
  ],
  technician: [
    'appointments:read',
    'clients:read',
    'assets:read',
    'assets:write',
    'chat:use',
    'timeoff:own',
  ],
};

// ─── Role Definitions ──────────────────────────────────────────────────
const ROLES = [
  {
    key: 'admin',
    name: 'Administrator',
    description: 'Acces complet la toate functionalitatile sistemului',
  },
  { key: 'manager', name: 'Manager', description: 'Gestionare operatiuni, echipa si rapoarte' },
  { key: 'sales', name: 'Vanzari', description: 'Programari, clienti, facturi si rapoarte' },
  {
    key: 'technician',
    name: 'Tehnician',
    description: 'Vizualizare programari proprii si echipamente',
  },
];

async function main() {
  console.log('🌱 Starting database seeding...');

  // ─── Upsert Roles ──────────────────────────────────────────────────
  console.log('Creating roles...');
  const roleRecords = {};
  for (const role of ROLES) {
    roleRecords[role.key] = await prisma.role.upsert({
      where: { key: role.key },
      update: { name: role.name, description: role.description },
      create: role,
    });
  }
  console.log(`✓ ${ROLES.length} roles created/verified`);

  // ─── Upsert Permissions ────────────────────────────────────────────
  console.log('Creating permissions...');
  const permRecords = {};
  for (const perm of PERMISSIONS) {
    permRecords[perm.key] = await prisma.permission.upsert({
      where: { key: perm.key },
      update: { name: perm.name, description: perm.description },
      create: perm,
    });
  }
  console.log(`✓ ${PERMISSIONS.length} permissions created/verified`);

  // ─── Upsert Role ↔ Permission Mappings ─────────────────────────────
  console.log('Mapping permissions to roles...');
  let mappingCount = 0;
  for (const [roleKey, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = roleRecords[roleKey];
    for (const permKey of permKeys) {
      const permission = permRecords[permKey];
      if (!permission) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
      mappingCount++;
    }
  }
  console.log(`✓ ${mappingCount} role-permission mappings created/verified`);

  // ─── Create default super admin user (if not exists) ───────────────
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@serviceflow.com' },
  });

  if (existingAdmin) {
    console.log('⚠️  Admin user already exists, skipping creation');
    console.log(`   Email: admin@serviceflow.com`);
  } else {
    console.log('Creating admin user...');
    const hashedPassword = await bcrypt.hash(
      'Admin123!',
      parseInt(process.env.HASH_SALT_ROUNDS || '10', 10)
    );

    await prisma.user.create({
      data: {
        email: 'admin@serviceflow.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        phoneNumber: '0000000000',
        employmentType: 'FULL_TIME',
        hireDate: new Date(),
        isSuperAdmin: true,
        isActive: true,
        leaveBalanceVacation: 21,
        leaveBalanceSick: 15,
        leaveBalancePersonal: 5,
        roles: {
          create: {
            roleId: roleRecords.admin.id,
          },
        },
      },
    });

    console.log('✓ Admin user created successfully!');
    console.log('\n📋 Admin Credentials:');
    console.log('   Email:    admin@serviceflow.com');
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
