const express = require('express');
const request = require('supertest');
const usersRouter = require('../api/users');
const prisma = require('../../lib/prisma');
const { verifyAccessToken } = require('../utils/token');
const cache = require('../utils/cache');
const bcrypt = require('bcryptjs');
const errorHandler = require('../middleware/errorHandler');

// Mock dependencies
jest.mock('../../lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../utils/token', () => ({
  verifyAccessToken: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('../utils/cache', () => ({
  del: jest.fn(),
  delPattern: jest.fn(),
  userWithRolesKey: jest.fn((userId) => `user:${userId}:roles`),
}));

jest.mock('../utils/transform', () => ({
  mapUser: jest.fn((user) => ({
    id: user.id,
    _id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.roles?.[0]?.role?.key || null,
    roles: user.roles?.map((r) => ({
      id: r.roleId,
      key: r.role?.key,
      name: r.role?.name,
    })) || [],
    isActive: user.isActive,
    createdAt: user.createdAt,
  })),
}));

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/users', usersRouter);
  app.use(errorHandler);
  return app;
};

describe('Profile API Endpoints', () => {
  let app;

  const mockUser = {
    id: 'user-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phoneNumber: '+40712345678',
    password: 'hashed_password',
    isActive: true,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    roles: [
      {
        roleId: 'role-1',
        role: {
          id: 'role-1',
          key: 'technician',
          name: 'Technician',
          permissions: [],
        },
      },
    ],
  };

  beforeEach(() => {
    app = createTestApp();
    jest.clearAllMocks();
    process.env.HASH_SALT_ROUNDS = '10';
  });

  describe('GET /api/users/profile', () => {
    it('returns current user profile when authenticated', async () => {
      verifyAccessToken.mockReturnValue({ sub: mockUser.id });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer valid_token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: mockUser.id,
        firstName: mockUser.firstName,
        email: mockUser.email,
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockUser.id },
        })
      );
    });

    it('returns 401 when no authentication token provided', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No authentication token');
    });

    it('returns 401 when token is invalid', async () => {
      verifyAccessToken.mockImplementation(() => {
        const error = new Error('Invalid token');
        error.name = 'JsonWebTokenError';
        throw error;
      });

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('returns 401 when user is inactive', async () => {
      verifyAccessToken.mockReturnValue({ sub: mockUser.id });
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer valid_token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('inactive');
    });

    it('returns 401 when user not found', async () => {
      verifyAccessToken.mockReturnValue({ sub: 'non-existent-user' });
      prisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer valid_token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/users/profile', () => {
    it('updates profile successfully with valid data', async () => {
      const updates = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phoneNumber: '+40712345679',
      };

      verifyAccessToken.mockReturnValue({ sub: mockUser.id });
      prisma.user.findUnique
        .mockResolvedValueOnce(mockUser) // For authentication
        .mockResolvedValueOnce(null) // For email uniqueness check
        .mockResolvedValueOnce({ ...mockUser, ...updates }); // For getCurrentUser in service
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        ...updates,
      });

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', 'Bearer valid_token')
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Profile updated successfully');
      expect(response.body.data.firstName).toBe('Jane');
      expect(response.body.data.email).toBe('jane.smith@example.com');
    });

    it('updates profile with partial data', async () => {
      const updates = {
        firstName: 'Jane',
      };

      verifyAccessToken.mockReturnValue({ sub: mockUser.id });
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        firstName: 'Jane',
      });

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', 'Bearer valid_token')
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.firstName).toBe('Jane');
    });

    it('returns 400 when validation fails - empty firstName', async () => {
      const updates = {
        firstName: '',
        lastName: 'Smith',
      };

      verifyAccessToken.mockReturnValue({ sub: mockUser.id });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', 'Bearer valid_token')
        .send(updates)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('returns 400 when validation fails - invalid email', async () => {
      const updates = {
        email: 'invalid-email',
      };

      verifyAccessToken.mockReturnValue({ sub: mockUser.id });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', 'Bearer valid_token')
        .send(updates)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('returns 400 when validation fails - phoneNumber too short', async () => {
      const updates = {
        phoneNumber: '123',
      };

      verifyAccessToken.mockReturnValue({ sub: mockUser.id });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', 'Bearer valid_token')
        .send(updates)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('returns 400 when no fields provided', async () => {
      verifyAccessToken.mockReturnValue({ sub: mockUser.id });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', 'Bearer valid_token')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('At least one field must be provided');
    });

    it('returns 409 when email is already taken', async () => {
      const updates = {
        email: 'taken@example.com',
      };

      verifyAccessToken.mockReturnValue({ sub: mockUser.id });
      prisma.user.findUnique
        .mockResolvedValueOnce(mockUser) // For authentication
        .mockResolvedValueOnce({
          id: 'other-user-id',
          email: 'taken@example.com',
        }); // For email uniqueness check

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', 'Bearer valid_token')
        .send(updates)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already in use');
    });

    it('returns 401 when not authenticated', async () => {
      const updates = {
        firstName: 'Jane',
      };

      const response = await request(app)
        .put('/api/users/profile')
        .send(updates)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('does not allow updating restricted fields through profile endpoint', async () => {
      const updates = {
        firstName: 'Jane',
        role: 'admin', // Attempt to escalate privileges
        isActive: false, // Attempt to deactivate account
      };

      verifyAccessToken.mockReturnValue({ sub: mockUser.id });
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        firstName: 'Jane',
        // role and isActive should remain unchanged
      });

      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', 'Bearer valid_token')
        .send(updates)
        .expect(200);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({
            role: expect.anything(),
            isActive: expect.anything(),
          }),
        })
      );
    });
  });

  describe('PUT /api/users/profile/password', () => {
    it('changes password successfully with correct current password', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword456Aa',
      };

      verifyAccessToken.mockReturnValue({ sub: mockUser.id });
      prisma.user.findUnique
        .mockResolvedValueOnce(mockUser) // For authentication
        .mockResolvedValueOnce({
          id: mockUser.id,
          email: mockUser.email,
          password: 'hashed_current_password',
        }); // For password verification
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('hashed_new_password');
      prisma.user.update.mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/api/users/profile/password')
        .set('Authorization', 'Bearer valid_token')
        .send(passwordData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Password changed successfully');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        passwordData.currentPassword,
        'hashed_current_password'
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(passwordData.newPassword, 10);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { password: 'hashed_new_password' },
      });
    });

    it('returns 401 when current password is incorrect', async () => {
      const passwordData = {
        currentPassword: 'WrongPassword',
        newPassword: 'NewPassword456Aa',
      };

      verifyAccessToken.mockReturnValue({ sub: mockUser.id });
      prisma.user.findUnique
        .mockResolvedValueOnce(mockUser) // For authentication
        .mockResolvedValueOnce({
          id: mockUser.id,
          email: mockUser.email,
          password: 'hashed_current_password',
        }); // For password verification
      bcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .put('/api/users/profile/password')
        .set('Authorization', 'Bearer valid_token')
        .send(passwordData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Current password is incorrect');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('returns 400 when validation fails - missing currentPassword', async () => {
      const passwordData = {
        newPassword: 'NewPassword456Aa',
      };

      verifyAccessToken.mockReturnValue({ sub: mockUser.id });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/api/users/profile/password')
        .set('Authorization', 'Bearer valid_token')
        .send(passwordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });

    it('returns 400 when validation fails - newPassword too short', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123',
        newPassword: 'Short1',
      };

      verifyAccessToken.mockReturnValue({ sub: mockUser.id });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/api/users/profile/password')
        .set('Authorization', 'Bearer valid_token')
        .send(passwordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('at least 8 characters');
    });

    it('returns 400 when validation fails - missing lowercase letter', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123',
        newPassword: 'NEWPASSWORD123',
      };

      verifyAccessToken.mockReturnValue({ sub: mockUser.id });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/api/users/profile/password')
        .set('Authorization', 'Bearer valid_token')
        .send(passwordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('lowercase letter');
    });

    it('returns 400 when validation fails - missing uppercase letter', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123',
        newPassword: 'newpassword123',
      };

      verifyAccessToken.mockReturnValue({ sub: mockUser.id });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/api/users/profile/password')
        .set('Authorization', 'Bearer valid_token')
        .send(passwordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('uppercase letter');
    });

    it('returns 400 when validation fails - missing number', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPasswordAbc',
      };

      verifyAccessToken.mockReturnValue({ sub: mockUser.id });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/api/users/profile/password')
        .set('Authorization', 'Bearer valid_token')
        .send(passwordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('number');
    });

    it('returns 400 when new password is same as current password', async () => {
      const passwordData = {
        currentPassword: 'SamePassword123',
        newPassword: 'SamePassword123',
      };

      verifyAccessToken.mockReturnValue({ sub: mockUser.id });
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const response = await request(app)
        .put('/api/users/profile/password')
        .set('Authorization', 'Bearer valid_token')
        .send(passwordData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('must be different');
    });

    it('returns 401 when not authenticated', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword456Aa',
      };

      const response = await request(app)
        .put('/api/users/profile/password')
        .send(passwordData)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});
