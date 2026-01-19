/**
 * Test Fixtures for Export Tests
 * Provides sample data for all entity types
 */

const mockAppointments = [
  {
    id: 1,
    title: 'Revizie anuală',
    description: 'Verificare completă a vehiculului',
    status: 'COMPLETED',
    scheduledStart: new Date('2024-01-15T10:00:00Z'),
    scheduledEnd: new Date('2024-01-15T12:00:00Z'),
    location: 'Service Principal',
    clientId: 1,
    assetId: 1,
    createdById: 1,
    createdAt: new Date('2024-01-10T09:00:00Z'),
    updatedAt: new Date('2024-01-15T12:00:00Z'),
    client: {
      id: 1,
      type: 'PF',
      firstName: 'Ion',
      lastName: 'Popescu',
      phone: '+40712345678',
      email: 'ion.popescu@example.com',
    },
    asset: {
      id: 1,
      identifier: 'B-123-ABC',
      manufacturer: 'Dacia',
      model: 'Logan',
      year: 2020,
      type: 'vehicle',
    },
    createdBy: {
      id: 1,
      firstName: 'Admin',
      lastName: 'User',
    },
  },
  {
    id: 2,
    title: 'Schimb ulei',
    description: 'Schimb ulei motor și filtru',
    status: 'PENDING',
    scheduledStart: new Date('2024-02-20T14:00:00Z'),
    scheduledEnd: new Date('2024-02-20T15:00:00Z'),
    location: 'Service Rapid',
    clientId: 2,
    assetId: 2,
    createdById: 1,
    createdAt: new Date('2024-02-15T10:00:00Z'),
    updatedAt: new Date('2024-02-15T10:00:00Z'),
    client: {
      id: 2,
      type: 'SRL',
      companyName: 'Auto Transport SRL',
      contactName: 'Maria Ionescu',
      phone: '+40723456789',
      email: 'contact@autotransport.ro',
    },
    asset: {
      id: 2,
      identifier: 'B-456-DEF',
      manufacturer: 'Mercedes',
      model: 'Sprinter',
      year: 2019,
      type: 'vehicle',
    },
    createdBy: {
      id: 1,
      firstName: 'Admin',
      lastName: 'User',
    },
  },
];

const mockInvoices = [
  {
    id: 1,
    invoiceNumber: 'INV-2024-001',
    status: 'PAID',
    issueDate: new Date('2024-01-15'),
    dueDate: new Date('2024-02-15'),
    subtotal: 500.00,
    tax: 95.00,
    total: 595.00,
    sentAt: new Date('2024-01-15T14:00:00Z'),
    paidAt: new Date('2024-01-20T10:30:00Z'),
    notes: 'Plată prin transfer bancar',
    clientId: 1,
    appointmentId: 1,
    client: {
      id: 1,
      type: 'PF',
      firstName: 'Ion',
      lastName: 'Popescu',
      vatNumber: null,
    },
    appointment: {
      id: 1,
      title: 'Revizie anuală',
    },
  },
  {
    id: 2,
    invoiceNumber: 'INV-2024-002',
    status: 'PREZENTAT',
    issueDate: new Date('2024-02-01'),
    dueDate: new Date('2024-03-01'),
    subtotal: 1200.00,
    tax: 228.00,
    total: 1428.00,
    sentAt: new Date('2024-02-01T09:00:00Z'),
    paidAt: null,
    notes: null,
    clientId: 2,
    appointmentId: 2,
    client: {
      id: 2,
      type: 'SRL',
      companyName: 'Auto Transport SRL',
      vatNumber: 'RO12345678',
    },
    appointment: {
      id: 2,
      title: 'Schimb ulei',
    },
  },
];

const mockClients = [
  {
    id: 1,
    type: 'PF',
    firstName: 'Ion',
    lastName: 'Popescu',
    companyName: null,
    contactName: null,
    phone: '+40712345678',
    email: 'ion.popescu@example.com',
    vatNumber: null,
    registrationNumber: null,
    notes: 'Client fidel',
    createdAt: new Date('2023-06-15T10:00:00Z'),
  },
  {
    id: 2,
    type: 'SRL',
    firstName: null,
    lastName: null,
    companyName: 'Auto Transport SRL',
    contactName: 'Maria Ionescu',
    phone: '+40723456789',
    email: 'contact@autotransport.ro',
    vatNumber: 'RO12345678',
    registrationNumber: 'J40/1234/2020',
    notes: 'Firmă de transport - comandă lunară',
    createdAt: new Date('2023-08-20T14:30:00Z'),
  },
  {
    id: 3,
    type: 'PF',
    firstName: 'Ana',
    lastName: 'Dumitrescu',
    companyName: null,
    contactName: null,
    phone: '+40734567890',
    email: 'ana.dumitrescu@example.com',
    vatNumber: null,
    registrationNumber: null,
    notes: null,
    createdAt: new Date('2024-01-05T11:15:00Z'),
  },
];

const mockUsers = [
  {
    id: 1,
    email: 'admin@viperx.ro',
    firstName: 'Admin',
    lastName: 'User',
    phoneNumber: '+40700000001',
    dateOfBirth: new Date('1985-05-15'),
    employmentType: 'FULL_TIME',
    hourlyRate: 50.00,
    hireDate: new Date('2020-01-01'),
    isActive: true,
    password: 'hashed_password_should_not_be_exported',
    roles: [
      {
        roleId: 'role-admin',
        role: {
          id: 'role-admin',
          key: 'admin',
          name: 'Administrator',
        },
      },
    ],
  },
  {
    id: 2,
    email: 'technician@viperx.ro',
    firstName: 'Vasile',
    lastName: 'Mecanic',
    phoneNumber: '+40700000002',
    dateOfBirth: new Date('1990-08-20'),
    employmentType: 'FULL_TIME',
    hourlyRate: 35.00,
    hireDate: new Date('2021-06-01'),
    isActive: true,
    password: 'hashed_password_should_not_be_exported',
    roles: [
      {
        roleId: 'role-tech',
        role: {
          id: 'role-tech',
          key: 'technician',
          name: 'Technician',
        },
      },
    ],
  },
  {
    id: 3,
    email: 'manager@viperx.ro',
    firstName: 'Elena',
    lastName: 'Manager',
    phoneNumber: '+40700000003',
    dateOfBirth: new Date('1987-03-10'),
    employmentType: 'FULL_TIME',
    hourlyRate: 45.00,
    hireDate: new Date('2020-06-15'),
    isActive: true,
    password: 'hashed_password_should_not_be_exported',
    roles: [
      {
        roleId: 'role-manager',
        role: {
          id: 'role-manager',
          key: 'manager',
          name: 'Manager',
        },
      },
    ],
  },
];

const mockLeaveRequests = [
  {
    id: 1,
    employeeId: 2,
    leaveType: 'VACATION',
    status: 'APPROVED',
    startDate: new Date('2024-07-01'),
    endDate: new Date('2024-07-14'),
    totalDays: 10,
    reason: 'Vacanță de vară',
    reviewerId: 3,
    reviewNotes: 'Aprobat -perioadă solicitată OK',
    reviewedAt: new Date('2024-06-15T10:00:00Z'),
    createdAt: new Date('2024-06-10T14:30:00Z'),
    employee: {
      id: 2,
      firstName: 'Vasile',
      lastName: 'Mecanic',
    },
    reviewer: {
      id: 3,
      firstName: 'Elena',
      lastName: 'Manager',
    },
  },
  {
    id: 2,
    employeeId: 2,
    leaveType: 'SICK',
    status: 'PENDING',
    startDate: new Date('2024-03-20'),
    endDate: new Date('2024-03-22'),
    totalDays: 3,
    reason: 'Concediu medical',
    reviewerId: null,
    reviewNotes: null,
    reviewedAt: null,
    createdAt: new Date('2024-03-19T09:00:00Z'),
    employee: {
      id: 2,
      firstName: 'Vasile',
      lastName: 'Mecanic',
    },
    reviewer: null,
  },
];

const mockTimeTracking = [
  {
    id: 1,
    employeeId: 2,
    clockIn: new Date('2024-02-15T08:00:00Z'),
    clockOut: new Date('2024-02-15T16:30:00Z'),
    breakDuration: 30,
    totalMinutes: 480,
    clockInLocation: 'Service Principal',
    clockOutLocation: 'Service Principal',
    notes: null,
    source: 'MANUAL',
  },
  {
    id: 2,
    employeeId: 2,
    clockIn: new Date('2024-02-16T08:15:00Z'),
    clockOut: new Date('2024-02-16T17:00:00Z'),
    breakDuration: 45,
    totalMinutes: 480,
    clockInLocation: 'Service Principal',
    clockOutLocation: 'Service Principal',
    notes: 'Lucru la comandă urgentă',
    source: 'SYSTEM',
  },
  {
    id: 3,
    employeeId: 3,
    clockIn: new Date('2024-02-15T09:00:00Z'),
    clockOut: new Date('2024-02-15T17:30:00Z'),
    breakDuration: 30,
    totalMinutes: 480,
    clockInLocation: 'Birou',
    clockOutLocation: 'Birou',
    notes: null,
    source: 'MANUAL',
  },
];

const mockTasks = [
  {
    id: 1,
    title: 'Schimb disc frână față',
    description: 'Disc uzat, vibrații la frânare',
    taskType: 'REPAIR',
    priority: 'HIGH',
    status: 'COMPLETED',
    dueDate: new Date('2024-02-20'),
    estimatedHours: 2,
    completionPercentage: 100,
    customerName: 'Ion Popescu',
    customerPhone: '+40712345678',
    customerVehicle: 'Dacia Logan B-123-ABC',
    createdById: 3,
    createdAt: new Date('2024-02-18T10:00:00Z'),
    createdBy: {
      id: 3,
      firstName: 'Elena',
      lastName: 'Manager',
    },
    assignments: [
      {
        userId: 2,
        user: {
          id: 2,
          firstName: 'Vasile',
          lastName: 'Mecanic',
        },
      },
    ],
  },
  {
    id: 2,
    title: 'Diagnosticare electronică',
    description: 'Verificare erori ECU',
    taskType: 'DIAGNOSTIC',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    dueDate: new Date('2024-02-22'),
    estimatedHours: 1,
    completionPercentage: 50,
    customerName: 'Auto Transport SRL',
    customerPhone: '+40723456789',
    customerVehicle: 'Mercedes Sprinter B-456-DEF',
    createdById: 3,
    createdAt: new Date('2024-02-21T09:00:00Z'),
    createdBy: {
      id: 3,
      firstName: 'Elena',
      lastName: 'Manager',
    },
    assignments: [
      {
        userId: 2,
        user: {
          id: 2,
          firstName: 'Vasile',
          lastName: 'Mecanic',
        },
      },
    ],
  },
];

// Sample filters for testing
const mockFilters = {
  appointments: {
    status: 'COMPLETED',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    clientId: 1,
    search: 'revizie',
  },
  invoices: {
    status: 'PAID',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    clientId: 1,
    search: 'INV-2024',
  },
  clients: {
    type: 'PF',
    search: 'popescu',
  },
  users: {
    isActive: true,
    employmentType: 'FULL_TIME',
    search: 'admin',
  },
  leaveRequests: {
    status: 'APPROVED',
    leaveType: 'VACATION',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
  },
  timeTracking: {
    employeeId: 2,
    startDate: '2024-02-01',
    endDate: '2024-02-28',
  },
  tasks: {
    status: 'COMPLETED',
    priority: 'HIGH',
    taskType: 'REPAIR',
    search: 'frână',
  },
};

// Mock user roles for permission testing
const mockUserRoles = {
  admin: [
    {
      roleId: 'role-admin',
      role: {
        id: 'role-admin',
        key: 'admin',
        name: 'Administrator',
      },
    },
  ],
  manager: [
    {
      roleId: 'role-manager',
      role: {
        id: 'role-manager',
        key: 'manager',
        name: 'Manager',
      },
    },
  ],
  technician: [
    {
      roleId: 'role-tech',
      role: {
        id: 'role-tech',
        key: 'technician',
        name: 'Technician',
      },
    },
  ],
  employee: [
    {
      roleId: 'role-employee',
      role: {
        id: 'role-employee',
        key: 'employee',
        name: 'Employee',
      },
    },
  ],
};

module.exports = {
  mockAppointments,
  mockInvoices,
  mockClients,
  mockUsers,
  mockLeaveRequests,
  mockTimeTracking,
  mockTasks,
  mockFilters,
  mockUserRoles,
};
