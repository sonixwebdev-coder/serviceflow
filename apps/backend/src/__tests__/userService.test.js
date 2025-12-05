const bcrypt = require('bcryptjs');
const { updateProfile, changePassword } = require('../services/userService');
const prisma = require('../../lib/prisma');
const { AppError } = require('../utils/errors');
const cache = require('../utils/cache');

jest.mock('../../lib/prisma', () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
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
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.roles?.[0]?.role?.key || null,
    roles: user.roles || [],
  })),
}));

describe('userService - Profile Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HASH_SALT_ROUNDS = '10';
  });

  describe('updateProfile', () => {
    const userId = 'user-123';
    const mockUser = {
      id: userId,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phoneNumber: '+40712345678',
      password: 'hashed_password',
      isActive: true,
      roles: [
        {
          roleId: 'role-1',
          role: {
            id: 'role-1',
            key: 'technician',
            name: 'Technician',
          },
        },
      ],
    };

    it('updates profile with all fields successfully', async () => {
      const updates = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phoneNumber: '+40712345679',
      };

      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        ...updates,
      });

      const result = await updateProfile(userId, updates);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: updates.email },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updates,
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });
      expect(result.firstName).toBe('Jane');
      expect(result.email).toBe('jane.smith@example.com');
      expect(cache.del).toHaveBeenCalledWith(`user:${userId}:roles`);
      expect(cache.delPattern).toHaveBeenCalledWith('users:list:*');
    });

    it('updates profile with partial fields', async () => {
      const updates = {
        firstName: 'Jane',
      };

      prisma.user.update.mockResolvedValue({
        ...mockUser,
        firstName: 'Jane',
      });

      const result = await updateProfile(userId, updates);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { firstName: 'Jane' },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });
      expect(result.firstName).toBe('Jane');
    });

    it('allows updating email to same email', async () => {
      const updates = {
        firstName: 'Jane',
        email: mockUser.email,
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        firstName: 'Jane',
      });

      const result = await updateProfile(userId, updates);

      expect(result.firstName).toBe('Jane');
      expect(result.email).toBe(mockUser.email);
    });

    it('throws error when email is already taken by another user', async () => {
      const updates = {
        email: 'taken@example.com',
      };

      prisma.user.findUnique.mockResolvedValue({
        id: 'other-user-id',
        email: 'taken@example.com',
      });

      await expect(updateProfile(userId, updates)).rejects.toThrow(AppError);
      await expect(updateProfile(userId, updates)).rejects.toMatchObject({
        message: 'Email is already in use by another user',
        status: 409,
      });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('handles undefined optional fields correctly', async () => {
      const updates = {
        firstName: 'Jane',
        phoneNumber: undefined,
      };

      prisma.user.update.mockResolvedValue({
        ...mockUser,
        firstName: 'Jane',
      });

      await updateProfile(userId, updates);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { firstName: 'Jane' },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });
    });

    it('does not allow updating password through profile endpoint', async () => {
      const updates = {
        firstName: 'Jane',
        password: 'should_not_update',
      };

      prisma.user.update.mockResolvedValue(mockUser);

      await updateProfile(userId, updates);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ password: expect.anything() }),
        })
      );
    });

    it('invalidates cache after successful update', async () => {
      const updates = { firstName: 'Jane' };

      prisma.user.update.mockResolvedValue({
        ...mockUser,
        firstName: 'Jane',
      });

      await updateProfile(userId, updates);

      expect(cache.del).toHaveBeenCalledWith(`user:${userId}:roles`);
      expect(cache.delPattern).toHaveBeenCalledWith('users:list:*');
    });
  });

  describe('changePassword', () => {
    const userId = 'user-123';
    const mockUser = {
      id: userId,
      email: 'john.doe@example.com',
      password: 'hashed_current_password',
    };

    it('changes password successfully with correct current password', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('hashed_new_password');
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        password: 'hashed_new_password',
      });

      const result = await changePassword(userId, passwordData);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          password: true,
          email: true,
        },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        passwordData.currentPassword,
        mockUser.password
      );
      expect(bcrypt.hash).toHaveBeenCalledWith(passwordData.newPassword, 10);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { password: 'hashed_new_password' },
      });
      expect(result).toEqual({ message: 'Password changed successfully' });
      expect(cache.del).toHaveBeenCalledWith(`user:${userId}:roles`);
    });

    it('throws error when user not found', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
      };

      prisma.user.findUnique.mockResolvedValue(null);

      await expect(changePassword(userId, passwordData)).rejects.toThrow(AppError);
      await expect(changePassword(userId, passwordData)).rejects.toMatchObject({
        message: 'User not found',
        status: 404,
      });
      expect(bcrypt.compare).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('throws error when current password is incorrect', async () => {
      const passwordData = {
        currentPassword: 'WrongPassword',
        newPassword: 'NewPassword456',
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await expect(changePassword(userId, passwordData)).rejects.toThrow(AppError);
      await expect(changePassword(userId, passwordData)).rejects.toMatchObject({
        message: 'Current password is incorrect',
        status: 401,
      });
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('hashes new password with correct salt rounds', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
      };

      process.env.HASH_SALT_ROUNDS = '12';

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('hashed_new_password');
      prisma.user.update.mockResolvedValue(mockUser);

      await changePassword(userId, passwordData);

      expect(bcrypt.hash).toHaveBeenCalledWith(passwordData.newPassword, 12);
    });

    it('uses default salt rounds when env var not set', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
      };

      delete process.env.HASH_SALT_ROUNDS;

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('hashed_new_password');
      prisma.user.update.mockResolvedValue(mockUser);

      await changePassword(userId, passwordData);

      expect(bcrypt.hash).toHaveBeenCalledWith(passwordData.newPassword, 10);
    });

    it('invalidates user cache after successful password change', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('hashed_new_password');
      prisma.user.update.mockResolvedValue(mockUser);

      await changePassword(userId, passwordData);

      expect(cache.del).toHaveBeenCalledWith(`user:${userId}:roles`);
    });

    it('handles bcrypt errors gracefully', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockRejectedValue(new Error('Bcrypt error'));

      await expect(changePassword(userId, passwordData)).rejects.toThrow('Bcrypt error');
    });

    it('handles database errors during password update', async () => {
      const passwordData = {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword456',
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('hashed_new_password');
      prisma.user.update.mockRejectedValue(new Error('Database error'));

      await expect(changePassword(userId, passwordData)).rejects.toThrow('Database error');
    });
  });
});
