const bcrypt = require('bcryptjs');
const prisma = require('../../lib/prisma');
const { AppError } = require('../utils/errors');
const { signAccessToken, generateRefreshToken } = require('../utils/token');
const { mapUser } = require('../utils/transform');
const { normalizeEmploymentType } = require('../utils/normalize');
const { ensureRole, normalizeRoleKey } = require('./roleService');

const sanitizeUser = (user) => {
  if (!user) return null;
  const mapped = mapUser(user);

  return {
    ...mapped,
    permissions:
      user.roles?.flatMap(
        (assignment) => assignment.role?.permissions?.map((rp) => rp.permission.key) || []
      ) || [],
  };
};

const registerUser = async ({ firstName, lastName, email, password, phoneNumber, roleKey, employmentType }) => {
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new AppError('Email is already in use', 409);
  }

  const hash = await bcrypt.hash(password, parseInt(process.env.HASH_SALT_ROUNDS || '10', 10));

  const data = await prisma.$transaction(async (tx) => {
    const targetRoleKey = normalizeRoleKey(roleKey);
    const role = await ensureRole(targetRoleKey, tx);

    const user = await tx.user.create({
      data: {
        firstName,
        lastName,
        email,
        password: hash,
        phoneNumber,
        employmentType: normalizeEmploymentType(employmentType) || undefined,
      },
    });

    await tx.userRole.create({
      data: {
        userId: user.id,
        roleId: role.id,
      },
    });

    return tx.user.findUnique({
      where: { id: user.id },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  });

  return sanitizeUser(data);
};

const loginUser = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  const payload = {
    sub: user.id,
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    roles: user.roles.map((assignment) => assignment.role.key),
  };

  const accessToken = signAccessToken(payload);
  const { token: refreshToken, expiresAt } = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      token: refreshToken,
      expiresAt,
    },
  });

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
};

const refreshSession = async ({ token }) => {
  const stored = await prisma.refreshToken.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new AppError('Invalid refresh token', 401);
  }

  // Rotate token
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const payload = {
    sub: stored.user.id,
    email: stored.user.email,
    name: `${stored.user.firstName} ${stored.user.lastName}`,
    roles: stored.user.roles.map((assignment) => assignment.role.key),
  };

  const accessToken = signAccessToken(payload);
  const { token: nextToken, expiresAt } = generateRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId: stored.user.id,
      token: nextToken,
      expiresAt,
    },
  });

  return {
    user: sanitizeUser(stored.user),
    accessToken,
    refreshToken: nextToken,
  };
};

const revokeRefreshToken = async ({ token }) => {
  await prisma.refreshToken.updateMany({
    where: { token, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

module.exports = {
  registerUser,
  loginUser,
  refreshSession,
  revokeRefreshToken,
};
