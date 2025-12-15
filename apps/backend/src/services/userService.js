const bcrypt = require('bcryptjs');
const { AppError } = require('../utils/errors');
const { mapUser } = require('../utils/transform');
const { normalizeEmploymentType } = require('../utils/normalize');
const { ensureRole, normalizeRoleKey } = require('./roleService');
const cache = require('../utils/cache');

const normalizeKey = (value) => (typeof value === 'string' ? value.toLowerCase().replace(/\s+/g, '-') : '');
const ADMIN_ROLE = 'admin';
const TECHNICIAN_ROLE = 'technician';

const hasRole = (user, roleKey) => {
  const normalized = normalizeKey(roleKey);
  if (!normalized || !user) return false;
  if (Array.isArray(user.roles)) {
    return user.roles.some((role) => normalizeKey(role) === normalized);
  }
  if (normalizeKey(user.role) === normalized) return true;
  return false;
};

const listUsers = async (prisma, { search, role, isActive }, currentUser, options = {}) => {
  const { skipCache = false } = options;
  const isAdmin = hasRole(currentUser, ADMIN_ROLE);
  const isManager = hasRole(currentUser, 'manager');

  // Build cache key with organizationId to ensure tenant isolation
  const filters = { search, role, isActive, organizationId: currentUser.organizationId };
  const cacheKey = cache.userListKey(filters);

  // Try cache first (only for non-search queries - search results change frequently)
  if (!skipCache && !search) {
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const where = {};

  if (typeof isActive === 'boolean') {
    where.isActive = isActive;
  }

  const normalizedRoleFilter = normalizeKey(role);

  if ((isAdmin || isManager) && normalizedRoleFilter) {
    where.roles = {
      some: {
        role: {
          key: normalizedRoleFilter,
        },
      },
    };
  } else if (!isAdmin && !isManager) {
    where.roles = {
      some: {
        role: {
          key: TECHNICIAN_ROLE,
        },
      },
    };
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    include: {
      roles: {
        include: {
          role: true,
        },
      },
      timeOffRequests: {
        where: {
          status: 'APPROVED',
        },
        select: {
          startDate: true,
          endDate: true,
        },
      },
    },
    orderBy: {
      firstName: 'asc',
    },
  });

  // Check leave status for each user
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = users.map(user => {
    const isOnLeave = user.timeOffRequests.some(leave => {
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      return today >= startDate && today <= endDate;
    });

    const mapped = mapUser(user);
    return {
      ...mapped,
      leaveStatus: isOnLeave ? 'IN_CONCEDIU' : 'DISPONIBIL',
    };
  });

  // Cache for 5 minutes (only non-search queries)
  if (!search) {
    await cache.set(cacheKey, result, cache.TTL.MEDIUM);
  }

  return result;
};

const getUserById = async (prisma, userId, options = {}) => {
  const { skipCache = false } = options;

  // Try cache first (unless explicitly skipped)
  if (!skipCache) {
    const cacheKey = cache.userWithRolesKey(userId);
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
      appointmentsCreated: true,
      appointmentsUpdated: true,
      appointmentAssignees: {
        include: {
          appointment: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const mapped = mapUser(user);

  // Cache user data for 5 minutes
  await cache.set(cache.userWithRolesKey(userId), mapped, cache.TTL.MEDIUM);

  return mapped;
};

const updateUserStatus = async (prisma, { userId, isActive }) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  // Invalidate user cache and user list caches
  await Promise.all([
    cache.del(cache.userWithRolesKey(userId)),
    cache.delPattern('users:list:*'),
  ]);

  return mapUser(user);
};

const getCurrentUser = async (prisma, userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return mapUser(user);
};

const coerceHourlyRate = (value, fallback = 0) => {
  if (value === undefined || value === null || value === '') return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

const createUser = async (prisma, payload) => {
  const {
    firstName,
    lastName,
    email,
    password,
    phoneNumber,
    dateOfBirth,
    employmentType,
    hourlyRate,
    role,
  } = payload;

  if (!password) {
    throw new AppError('Password is required', 400);
  }

  // SECURITY: Normalize email to lowercase to prevent duplicate accounts
  const normalizedEmail = email.toLowerCase().trim();

  // Validate date of birth if provided
  if (dateOfBirth) {
    const parsedDate = new Date(dateOfBirth);
    if (isNaN(parsedDate.getTime())) {
      throw new AppError('Invalid date of birth format', 400);
    }
  }

  const hash = await bcrypt.hash(password, parseInt(process.env.HASH_SALT_ROUNDS || '10', 10));

  try {
    const data = await prisma.$transaction(async (tx) => {
      // Check for existing email inside transaction to prevent race condition
      const existing = await tx.user.findUnique({ where: { email: normalizedEmail } });
      if (existing) {
        throw new AppError('Email already in use', 409);
      }

      const roleRecord = await ensureRole(normalizeRoleKey(role), tx);

      const user = await tx.user.create({
        data: {
          firstName,
          lastName,
          email: normalizedEmail,
          password: hash,
          phoneNumber,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          employmentType: normalizeEmploymentType(employmentType) || undefined,
        hourlyRate: coerceHourlyRate(hourlyRate, 0),
        },
      });

      await tx.userRole.create({
        data: {
          userId: user.id,
          roleId: roleRecord.id,
        },
      });

      return tx.user.findUnique({
        where: { id: user.id },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });
    });

    // Invalidate user list and roles caches when new user is created
    await Promise.all([
      cache.delPattern('users:list:*'),
      cache.del(cache.rolesKey()),
    ]);

    return mapUser(data);
  } catch (error) {
    // Handle Prisma unique constraint violations
    if (error.code === 'P2002') {
      const target = error.meta?.target || [];
      if (target.includes('email')) {
        throw new AppError('Email already in use', 409);
      }
      throw new AppError('A user with this information already exists', 409);
    }
    // Re-throw AppError instances and other errors
    throw error;
  }
};

const updateUser = async (prisma, userId, payload) => {
  const {
    firstName,
    lastName,
    email,
    phoneNumber,
    dateOfBirth,
    employmentType,
    hourlyRate,
    role,
    password,
  } = payload;

  // Validate date of birth if provided
  if (dateOfBirth) {
    const parsedDate = new Date(dateOfBirth);
    if (isNaN(parsedDate.getTime())) {
      throw new AppError('Invalid date of birth format', 400);
    }
  }

  try {
    const data = await prisma.$transaction(async (tx) => {
      // Check if email is being changed and if it's already taken by another user
      if (email) {
        const normalizedEmail = email.toLowerCase().trim();
        const existingUser = await tx.user.findUnique({
          where: { email: normalizedEmail },
        });

        if (existingUser && existingUser.id !== userId) {
          throw new AppError('Email is already in use by another user', 409);
        }
      }

      const updates = {
        firstName,
        lastName,
        email: email ? email.toLowerCase().trim() : undefined, // SECURITY: Normalize email
        phoneNumber,
        employmentType: normalizeEmploymentType(employmentType) || undefined,
        hourlyRate: coerceHourlyRate(hourlyRate, undefined),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      };

      if (password) {
        updates.password = await bcrypt.hash(password, parseInt(process.env.HASH_SALT_ROUNDS || '10', 10));
      }

      const user = await tx.user.update({
        where: { id: userId },
        data: updates,
      });

      if (role) {
        const roleRecord = await ensureRole(normalizeRoleKey(role), tx);
        await tx.userRole.deleteMany({ where: { userId: user.id } });
        await tx.userRole.create({ data: { userId: user.id, roleId: roleRecord.id } });
      }

      return tx.user.findUnique({
        where: { id: user.id },
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
      });
    });

    // Invalidate user cache, user list, and roles caches
    await Promise.all([
      cache.del(cache.userWithRolesKey(userId)),
      cache.delPattern('users:list:*'),
      cache.del(cache.rolesKey()),
    ]);

    return mapUser(data);
  } catch (error) {
    // Handle Prisma errors
    if (error.code === 'P2002') {
      const target = error.meta?.target || [];
      if (target.includes('email')) {
        throw new AppError('Email is already in use by another user', 409);
      }
      throw new AppError('A user with this information already exists', 409);
    }
    if (error.code === 'P2025') {
      throw new AppError('User not found', 404);
    }
    // Re-throw AppError instances and other errors
    throw error;
  }
};

const deactivateUser = async (prisma, userId) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });

  // Invalidate user cache and user list caches
  await Promise.all([
    cache.del(cache.userWithRolesKey(userId)),
    cache.delPattern('users:list:*'),
  ]);

  return mapUser(user);
};

/**
 * Update current user's profile
 * Users can only update their own basic profile information
 * Role changes are explicitly prevented
 * SECURITY: Email addresses are normalized to lowercase
 */
const updateProfile = async (prisma, userId, payload) => {
  const { firstName, lastName, email, phoneNumber } = payload;

  // SECURITY: Normalize email to lowercase
  const normalizedEmail = email ? email.toLowerCase().trim() : undefined;

  // Check if email is being changed and if it's already taken
  if (normalizedEmail) {
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new AppError('Email is already in use by another user', 409);
    }
  }

  // Build update object with only allowed fields
  const updates = {};
  if (firstName !== undefined) updates.firstName = firstName;
  if (lastName !== undefined) updates.lastName = lastName;
  if (normalizedEmail !== undefined) updates.email = normalizedEmail;
  if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;

  const user = await prisma.user.update({
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

  // Invalidate user cache and user list caches
  await Promise.all([
    cache.del(cache.userWithRolesKey(userId)),
    cache.delPattern('users:list:*'),
  ]);

  return mapUser(user);
};

/**
 * Change user's password
 * Requires verification of current password for security
 * SECURITY: Protected against timing attacks and brute force
 */
const changePassword = async (prisma, userId, { currentPassword, newPassword }) => {
  // SECURITY: Check for account lockout due to failed attempts
  const lockoutKey = `password_lockout:${userId}`;
  const failedAttemptsKey = `password_failed:${userId}`;

  const lockoutExpiry = await cache.get(lockoutKey);
  if (lockoutExpiry) {
    const remainingTime = Math.ceil((lockoutExpiry - Date.now()) / 60000);
    console.warn(`[SECURITY] Password change blocked for user ${userId} - account locked for ${remainingTime} more minutes`);
    throw new AppError(`Account temporarily locked due to multiple failed attempts. Try again in ${remainingTime} minutes.`, 429);
  }

  // Fetch user with password
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      password: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  // SECURITY: Always perform bcrypt comparison even if user not found
  // This prevents timing attacks that could enumerate valid user IDs
  const dummyHash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU0qKFXhQ2me'; // Dummy bcrypt hash
  const passwordToCheck = user ? user.password : dummyHash;
  const isMatch = await bcrypt.compare(currentPassword, passwordToCheck);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!isMatch) {
    // SECURITY: Track failed password change attempts
    let failedAttempts = (await cache.get(failedAttemptsKey)) || 0;
    failedAttempts++;

    console.warn(`[SECURITY] Failed password change attempt for user ${userId} (${user.email}) - Attempt ${failedAttempts}/5`);

    if (failedAttempts >= 5) {
      // Lock account for 15 minutes
      const lockoutExpires = Date.now() + (15 * 60 * 1000);
      await cache.set(lockoutKey, lockoutExpires, 15 * 60); // 15 minutes in seconds
      await cache.del(failedAttemptsKey);
      console.error(`[SECURITY] Account locked for user ${userId} (${user.email}) due to 5 failed password change attempts`);
      throw new AppError('Too many failed attempts. Account locked for 15 minutes.', 429);
    }

    // Store failed attempts for 1 hour
    await cache.set(failedAttemptsKey, failedAttempts, 60 * 60);
    throw new AppError('Current password is incorrect', 401);
  }

  // SECURITY: Clear failed attempts on successful verification
  await cache.del(failedAttemptsKey);

  // Hash new password
  const hash = await bcrypt.hash(newPassword, parseInt(process.env.HASH_SALT_ROUNDS || '10', 10));

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { password: hash },
  });

  // Invalidate user cache
  await cache.del(cache.userWithRolesKey(userId));

  // SECURITY: Log successful password change
  console.info(`[SECURITY] Password changed successfully for user ${userId} (${user.email})`);

  return { message: 'Password changed successfully' };
};

module.exports = {
  listUsers,
  getUserById,
  updateUserStatus,
  getCurrentUser,
  createUser,
  updateUser,
  deactivateUser,
  updateProfile,
  changePassword,
};
