/**
 * Test helper utilities for user profile tests
 */

/**
 * Creates a mock Express request object
 */
const createMockRequest = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: null,
  header: jest.fn((name) => overrides.headers?.[name]),
  ...overrides,
});

/**
 * Creates a mock Express response object
 */
const createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };
  return res;
};

/**
 * Creates a mock Express next function
 */
const createMockNext = () => jest.fn();

/**
 * Helper to extract validation errors from Zod error
 */
const extractValidationErrors = (zodError) => {
  if (!zodError.issues) return [];
  return zodError.issues.map((err) => ({
    path: err.path.join('.'),
    message: err.message,
  }));
};

/**
 * Helper to create authorization header
 */
const createAuthHeader = (token = 'valid_token') => ({
  Authorization: `Bearer ${token}`,
});

/**
 * Helper to mock Prisma user findUnique for authentication
 */
const mockAuthenticatedUser = (prisma, user) => {
  prisma.user.findUnique.mockResolvedValue(user);
};

/**
 * Helper to mock JWT verification
 */
const mockJWTVerification = (verifyAccessToken, userId) => {
  verifyAccessToken.mockReturnValue({
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
};

/**
 * Helper to mock JWT verification failure
 */
const mockJWTVerificationFailure = (verifyAccessToken, errorType = 'JsonWebTokenError') => {
  verifyAccessToken.mockImplementation(() => {
    const error = new Error('Token verification failed');
    error.name = errorType;
    throw error;
  });
};

/**
 * Helper to mock bcrypt compare success
 */
const mockPasswordMatch = (bcrypt, password = 'any', hashedPassword = 'hashed') => {
  bcrypt.compare.mockImplementation((plain, hashed) => {
    if (plain === password && hashed === hashedPassword) {
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  });
};

/**
 * Helper to mock bcrypt hash
 */
const mockPasswordHash = (bcrypt, hashedResult = 'hashed_password') => {
  bcrypt.hash.mockResolvedValue(hashedResult);
};

/**
 * Helper to verify cache invalidation
 */
const verifyCacheInvalidation = (cache, userId) => {
  expect(cache.del).toHaveBeenCalledWith(`user:${userId}:roles`);
  expect(cache.delPattern).toHaveBeenCalledWith('users:list:*');
};

/**
 * Helper to reset all mocks
 */
const resetAllMocks = (...mocks) => {
  mocks.forEach((mock) => {
    if (mock.mockClear) {
      mock.mockClear();
    }
  });
};

/**
 * Helper to wait for async operations
 */
const waitFor = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Helper to create a date in the past
 */
const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

/**
 * Helper to create a date in the future
 */
const daysFromNow = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

/**
 * Helper to generate random email
 */
const randomEmail = () => `test_${Math.random().toString(36).substring(7)}@example.com`;

/**
 * Helper to generate random phone number
 */
const randomPhone = () => `+407${Math.floor(10000000 + Math.random() * 90000000)}`;

/**
 * Helper to generate random user ID
 */
const randomUserId = () => `user_${Math.random().toString(36).substring(7)}`;

/**
 * Helper to assert AppError properties
 */
const assertAppError = (error, expectedMessage, expectedStatus) => {
  expect(error).toBeDefined();
  expect(error.name).toBe('AppError');
  expect(error.message).toContain(expectedMessage);
  expect(error.status).toBe(expectedStatus);
};

/**
 * Helper to create test timeout wrapper
 */
const withTimeout = (fn, timeout = 5000) => {
  return () => {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Test timeout after ${timeout}ms`));
      }, timeout);

      Promise.resolve(fn())
        .then(() => {
          clearTimeout(timer);
          resolve();
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });
  };
};

/**
 * Helper to verify Prisma query structure
 */
const verifyPrismaQuery = (prismaMock, method, expectedWhere, expectedData = null) => {
  expect(prismaMock[method]).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining(expectedWhere),
      ...(expectedData && {
        data: expect.objectContaining(expectedData),
      }),
    })
  );
};

/**
 * Helper to create bulk test users
 */
const createBulkUsers = (count, baseUser) => {
  return Array.from({ length: count }, (_, i) => ({
    ...baseUser,
    id: `user-${i + 1}`,
    email: `user${i + 1}@example.com`,
    firstName: `User${i + 1}`,
  }));
};

/**
 * Helper to assert response structure
 */
const assertSuccessResponse = (response, expectedStatus = 200) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toHaveProperty('success', true);
  expect(response.body).toHaveProperty('data');
  expect(response.body).toHaveProperty('message');
};

/**
 * Helper to assert error response structure
 */
const assertErrorResponse = (response, expectedStatus) => {
  expect(response.status).toBe(expectedStatus);
  expect(response.body).toHaveProperty('success', false);
  expect(response.body).toHaveProperty('message');
};

/**
 * Helper to deep clone objects (useful for immutable test data)
 */
const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

/**
 * Helper to strip undefined values from object
 */
const stripUndefined = (obj) => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});
};

module.exports = {
  // Mock creators
  createMockRequest,
  createMockResponse,
  createMockNext,

  // Validation helpers
  extractValidationErrors,

  // Auth helpers
  createAuthHeader,
  mockAuthenticatedUser,
  mockJWTVerification,
  mockJWTVerificationFailure,

  // Password helpers
  mockPasswordMatch,
  mockPasswordHash,

  // Cache helpers
  verifyCacheInvalidation,

  // Utility helpers
  resetAllMocks,
  waitFor,
  daysAgo,
  daysFromNow,
  randomEmail,
  randomPhone,
  randomUserId,

  // Assertion helpers
  assertAppError,
  assertSuccessResponse,
  assertErrorResponse,
  verifyPrismaQuery,

  // Test utilities
  withTimeout,
  createBulkUsers,
  deepClone,
  stripUndefined,
};
