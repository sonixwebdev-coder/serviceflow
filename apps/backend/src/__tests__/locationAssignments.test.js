const globalPrisma = require('../../lib/prisma');
const {
  assignUsersToLocation,
  getUserPrimaryLocation,
} = require('../services/location/assignments');

jest.mock('../../lib/prisma', () => ({
  userLocation: {
    createMany: jest.fn(),
    updateMany: jest.fn(),
    findFirst: jest.fn(),
  },
}));

describe('location assignment helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('assigns users, updates primary flags, and joins the location channel', async () => {
    const prisma = {
      location: { findUnique: jest.fn().mockResolvedValue({ organizationId: 'org-1' }) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'user-1' }, { id: 'user-2' }]) },
      chatChannel: { findFirst: jest.fn().mockResolvedValue({ id: 'channel-1' }) },
      chatMember: { createMany: jest.fn() },
    };

    const result = await assignUsersToLocation(prisma, 'location-1', ['user-1', 'user-2'], {
      setPrimary: true,
    });

    expect(result.message).toContain('2 utilizator(i)');
    expect(globalPrisma.userLocation.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 'user-1', locationId: 'location-1', isPrimary: true },
        { userId: 'user-2', locationId: 'location-1', isPrimary: true },
      ],
      skipDuplicates: true,
    });
    expect(globalPrisma.userLocation.updateMany).toHaveBeenCalledTimes(2);
    expect(prisma.chatMember.createMany).toHaveBeenCalledWith({
      data: [
        { channelId: 'channel-1', userId: 'user-1', role: 'MEMBER' },
        { channelId: 'channel-1', userId: 'user-2', role: 'MEMBER' },
      ],
      skipDuplicates: true,
    });
  });

  it('rejects users that are not all in the location organization', async () => {
    const prisma = {
      location: { findUnique: jest.fn().mockResolvedValue({ organizationId: 'org-1' }) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'user-1' }]) },
    };

    await expect(assignUsersToLocation(prisma, 'location-1', ['user-1', 'user-2'])).rejects.toThrow(
      'nu au fost gasiti'
    );
    expect(globalPrisma.userLocation.createMany).not.toHaveBeenCalled();
  });

  it('falls back to the first assigned location when no primary exists', async () => {
    globalPrisma.userLocation.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ location: { id: 'location-2' } });

    await expect(getUserPrimaryLocation({}, 'user-1')).resolves.toEqual({ id: 'location-2' });
    expect(globalPrisma.userLocation.findFirst).toHaveBeenCalledTimes(2);
  });
});
