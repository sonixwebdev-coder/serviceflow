const invalidateOrganizationAuthCache = async (prisma, cache, organizationId) => {
  const organizationUsers = await prisma.user.findMany({
    where: { organizationId },
    select: { id: true },
  });

  await Promise.all(organizationUsers.map((user) => cache.del(`auth:${user.id}`)));
};

module.exports = { invalidateOrganizationAuthCache };
