const publicBookingService = require('../services/publicBookingService');

jest.mock('../realtime/emitter', () => ({
  emitToOrganization: jest.fn(),
}));

jest.mock('../constants/activitySectors', () => ({
  getSectorConfig: jest.fn((sector) => ({ key: sector, hasAssets: false })),
}));

jest.mock('../utils/timezone', () => ({
  dayBoundsInTimezone: jest.fn(() => ({
    startOfDay: new Date('2099-01-02T00:00:00.000Z'),
    endOfDay: new Date('2099-01-02T23:59:59.999Z'),
  })),
  dateInTimezone: jest.fn(
    (year, month, day, hour, minute) => new Date(Date.UTC(year, month - 1, day, hour, minute))
  ),
}));

jest.mock('../services/email/emailService', () => ({
  sendAppointmentReminder: jest.fn(),
}));

jest.mock('../services/companySettingService', () => ({
  getCompanySettings: jest.fn(),
}));

jest.mock('../services/notificationService', () => ({
  createNotification: jest.fn(),
}));

jest.mock('../services/pushNotificationService', () => ({
  sendPushToUser: jest.fn(),
}));

jest.mock('../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

describe('publicBookingService availability facade', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('assembles public organization details with booking defaults and ordered locations', async () => {
    const prisma = {
      organization: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'org1',
          name: 'Example',
          slug: 'example',
          activitySector: 'AUTOMOTIVE',
          settings: { publicBooking: { workingHours: { start: 8 }, allowWeekends: true } },
        }),
      },
      location: {
        findMany: jest.fn().mockResolvedValue([{ id: 'location1' }, { id: 'location2' }]),
      },
    };

    const result = await publicBookingService.getOrganizationBySlug(prisma, 'example');

    expect(result).toMatchObject({
      id: 'org1',
      hasMultipleLocations: true,
      publicBookingSettings: {
        workingHours: { start: 8, end: 18 },
        slotDuration: 60,
        allowWeekends: true,
      },
      sectorConfig: { key: 'AUTOMOTIVE' },
    });
    expect(prisma.location.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 'org1', isActive: true },
        orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
      })
    );
  });

  it('generates future slots using resource capacity and business hours', async () => {
    const prisma = {
      resource: { findMany: jest.fn().mockResolvedValue([{ id: 'resource1', capacity: 1 }]) },
      appointment: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const slots = await publicBookingService.getAvailableSlots(prisma, {
      organizationId: 'org1',
      date: '2099-01-02',
      duration: 30,
      settings: { workingHours: { start: 9, end: 10 } },
    });

    expect(slots).toHaveLength(2);
    expect(slots.map((slot) => slot.formatted)).toEqual(['09:00', '09:30']);
    expect(slots.every((slot) => slot.availableCapacity === 1)).toBe(true);
    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org1',
          status: { notIn: ['CANCELLED'] },
        }),
      })
    );
  });

  it('returns the established date shape and weekend option', async () => {
    const dates = await publicBookingService.getAvailableDates(
      {},
      { days: 2, settings: { allowWeekends: true } }
    );

    expect(dates).toHaveLength(2);
    expect(dates[0]).toEqual(
      expect.objectContaining({
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        dayOfWeek: expect.any(String),
        formatted: expect.any(String),
      })
    );
  });
});
