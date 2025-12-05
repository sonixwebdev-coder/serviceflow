/**
 * Test fixtures for user-related tests
 * Provides consistent test data across all user test suites
 */

/**
 * Base user fixture - typical technician user
 */
const createBaseUser = (overrides = {}) => ({
  id: 'user-123',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phoneNumber: '+40712345678',
  password: 'hashed_password_12345',
  isActive: true,
  dateOfBirth: new Date('1990-01-01'),
  employmentType: 'FULL_TIME',
  hourlyRate: 50,
  hireDate: new Date('2024-01-01'),
  avatarUrl: null,
  leaveBalanceVacation: 20,
  leaveBalanceSick: 10,
  leaveBalancePersonal: 5,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  roles: [
    {
      id: 'user-role-1',
      userId: 'user-123',
      roleId: 'role-tech',
      role: {
        id: 'role-tech',
        key: 'technician',
        name: 'Technician',
        permissions: [],
      },
    },
  ],
  ...overrides,
});

/**
 * Admin user fixture
 */
const createAdminUser = (overrides = {}) => ({
  id: 'user-admin',
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@example.com',
  phoneNumber: '+40712345677',
  password: 'hashed_admin_password',
  isActive: true,
  dateOfBirth: new Date('1985-01-01'),
  employmentType: 'FULL_TIME',
  hourlyRate: 100,
  hireDate: new Date('2023-01-01'),
  avatarUrl: null,
  leaveBalanceVacation: 25,
  leaveBalanceSick: 15,
  leaveBalancePersonal: 10,
  createdAt: new Date('2023-01-01T00:00:00Z'),
  updatedAt: new Date('2023-01-01T00:00:00Z'),
  roles: [
    {
      id: 'user-role-admin',
      userId: 'user-admin',
      roleId: 'role-admin',
      role: {
        id: 'role-admin',
        key: 'admin',
        name: 'Administrator',
        permissions: [
          {
            id: 'role-perm-1',
            roleId: 'role-admin',
            permissionId: 'perm-all',
            permission: {
              id: 'perm-all',
              key: 'all',
              name: 'All Permissions',
            },
          },
        ],
      },
    },
  ],
  ...overrides,
});

/**
 * Manager user fixture
 */
const createManagerUser = (overrides = {}) => ({
  id: 'user-manager',
  firstName: 'Manager',
  lastName: 'User',
  email: 'manager@example.com',
  phoneNumber: '+40712345676',
  password: 'hashed_manager_password',
  isActive: true,
  dateOfBirth: new Date('1988-01-01'),
  employmentType: 'FULL_TIME',
  hourlyRate: 75,
  hireDate: new Date('2023-06-01'),
  avatarUrl: null,
  leaveBalanceVacation: 22,
  leaveBalanceSick: 12,
  leaveBalancePersonal: 8,
  createdAt: new Date('2023-06-01T00:00:00Z'),
  updatedAt: new Date('2023-06-01T00:00:00Z'),
  roles: [
    {
      id: 'user-role-manager',
      userId: 'user-manager',
      roleId: 'role-manager',
      role: {
        id: 'role-manager',
        key: 'manager',
        name: 'Manager',
        permissions: [],
      },
    },
  ],
  ...overrides,
});

/**
 * Inactive user fixture
 */
const createInactiveUser = (overrides = {}) =>
  createBaseUser({
    id: 'user-inactive',
    email: 'inactive@example.com',
    isActive: false,
    ...overrides,
  });

/**
 * User without roles fixture (edge case)
 */
const createUserWithoutRoles = (overrides = {}) => ({
  ...createBaseUser({
    id: 'user-no-roles',
    email: 'noroles@example.com',
  }),
  roles: [],
  ...overrides,
});

/**
 * Multiple users for list/search tests
 */
const createUserList = () => [
  createBaseUser(),
  createAdminUser(),
  createManagerUser(),
  createBaseUser({
    id: 'user-124',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phoneNumber: '+40712345679',
  }),
  createBaseUser({
    id: 'user-125',
    firstName: 'Bob',
    lastName: 'Johnson',
    email: 'bob.johnson@example.com',
    phoneNumber: '+40712345680',
  }),
];

/**
 * Profile update payloads
 */
const profileUpdatePayloads = {
  valid: {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    phoneNumber: '+40712345679',
  },
  partial: {
    firstName: 'Jane',
  },
  emailOnly: {
    email: 'newemail@example.com',
  },
  phoneOnly: {
    phoneNumber: '+40712999999',
  },
  invalid: {
    emptyFirstName: {
      firstName: '',
      lastName: 'Smith',
    },
    invalidEmail: {
      email: 'not-an-email',
    },
    shortPhone: {
      phoneNumber: '123',
    },
    noFields: {},
  },
};

/**
 * Password change payloads
 */
const passwordChangePayloads = {
  valid: {
    currentPassword: 'OldPassword123',
    newPassword: 'NewPassword456Aa',
  },
  validStrong: {
    currentPassword: 'OldPassword123',
    newPassword: 'VeryStr0ng!Pass#2025',
  },
  invalid: {
    missingCurrent: {
      newPassword: 'NewPassword456Aa',
    },
    missingNew: {
      currentPassword: 'OldPassword123',
    },
    tooShort: {
      currentPassword: 'OldPassword123',
      newPassword: 'Short1',
    },
    noLowercase: {
      currentPassword: 'OldPassword123',
      newPassword: 'NEWPASSWORD123',
    },
    noUppercase: {
      currentPassword: 'OldPassword123',
      newPassword: 'newpassword123',
    },
    noNumber: {
      currentPassword: 'OldPassword123',
      newPassword: 'NewPasswordAbc',
    },
    sameAsOld: {
      currentPassword: 'SamePassword123',
      newPassword: 'SamePassword123',
    },
  },
};

/**
 * Mock JWT tokens for authentication tests
 */
const mockTokens = {
  validToken: 'valid_jwt_token_12345',
  expiredToken: 'expired_jwt_token_12345',
  invalidToken: 'invalid_jwt_token_12345',
  malformedToken: 'not.a.jwt',
};

/**
 * Mock authentication payloads
 */
const mockAuthPayloads = {
  baseUser: {
    sub: 'user-123',
    email: 'john.doe@example.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  },
  adminUser: {
    sub: 'user-admin',
    email: 'admin@example.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  },
  expiredPayload: {
    sub: 'user-123',
    email: 'john.doe@example.com',
    iat: Math.floor(Date.now() / 1000) - 7200,
    exp: Math.floor(Date.now() / 1000) - 3600,
  },
};

/**
 * Prisma mock responses for common scenarios
 */
const prismaMockResponses = {
  userNotFound: null,
  emailTaken: (email) => ({
    id: 'other-user-id',
    email,
  }),
  userWithPassword: (user) => ({
    id: user.id,
    email: user.email,
    password: user.password,
  }),
};

/**
 * Expected mapped user responses (after transform)
 */
const expectedMappedUsers = {
  baseUser: {
    id: 'user-123',
    _id: 'user-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phoneNumber: '+40712345678',
    role: 'technician',
    roles: [
      {
        id: 'role-tech',
        _id: 'role-tech',
        key: 'technician',
        name: 'Technician',
      },
    ],
    isActive: true,
  },
  adminUser: {
    id: 'user-admin',
    _id: 'user-admin',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@example.com',
    phoneNumber: '+40712345677',
    role: 'admin',
    roles: [
      {
        id: 'role-admin',
        _id: 'role-admin',
        key: 'admin',
        name: 'Administrator',
      },
    ],
    isActive: true,
  },
};

module.exports = {
  // User fixtures
  createBaseUser,
  createAdminUser,
  createManagerUser,
  createInactiveUser,
  createUserWithoutRoles,
  createUserList,

  // Payload fixtures
  profileUpdatePayloads,
  passwordChangePayloads,

  // Auth fixtures
  mockTokens,
  mockAuthPayloads,

  // Mock responses
  prismaMockResponses,
  expectedMappedUsers,
};
