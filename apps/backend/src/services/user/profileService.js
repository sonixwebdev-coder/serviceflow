const { AppError } = require('../../utils/errors');
const { mapUser } = require('../../utils/transform');
const cache = require('../../utils/cache');

/** Update the authenticated user's basic profile fields only. */
const updateProfile = async (prisma, userId, payload) => {
  const { firstName, lastName, email, phoneNumber } = payload;
  const normalizedEmail = email ? email.toLowerCase().trim() : undefined;

  if (normalizedEmail) {
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new AppError('Email is already in use by another user', 409);
    }
  }

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

  await Promise.all([cache.del(cache.userWithRolesKey(userId)), cache.delPattern('users:list:*')]);
  return mapUser(user);
};

module.exports = { updateProfile };
