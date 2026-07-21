const { AppError } = require('../../utils/errors');
const { getSectorConfig } = require('../../constants/activitySectors');
const { dateInTimezone, dayBoundsInTimezone } = require('../../utils/timezone');

const DEFAULT_WORK_START = 9;
const DEFAULT_WORK_END = 18;
const DEFAULT_SLOT_INTERVAL = 30;

const getOrganizationBySlug = async (prisma, slug) => {
  const organization = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      settings: true,
      activitySector: true,
    },
  });

  if (!organization) throw new AppError('Organization not found', 404);

  const locations = await prisma.location.findMany({
    where: { organizationId: organization.id, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      city: true,
      county: true,
      phone: true,
      isPrimary: true,
    },
    orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
  });

  const sectorConfig = getSectorConfig(organization.activitySector);
  const publicBooking = organization.settings?.publicBooking || {};
  const publicBookingSettings = {
    workingHours: {
      start: publicBooking.workingHours?.start ?? DEFAULT_WORK_START,
      end: publicBooking.workingHours?.end ?? DEFAULT_WORK_END,
    },
    slotDuration: publicBooking.slotDuration || 60,
    allowWeekends: publicBooking.allowWeekends || false,
  };

  return {
    ...organization,
    locations,
    hasMultipleLocations: locations.length > 1,
    sectorConfig,
    publicBookingSettings,
  };
};

const getOrganizationCapacity = async (prisma, organizationId, locationId = null) => {
  const resourceWhere = { organizationId, isActive: true };
  if (locationId) resourceWhere.locationId = locationId;

  const resources = await prisma.resource.findMany({
    where: resourceWhere,
    select: {
      id: true,
      name: true,
      capacity: true,
      locationId: true,
    },
  });

  return {
    resources,
    totalCapacity: resources.reduce((sum, resource) => sum + resource.capacity, 0) || 1,
  };
};

const getAvailableSlots = async (
  prisma,
  { organizationId, date, duration = 60, settings = null, locationId = null }
) => {
  const [year, month, day] = date.split('-').map(Number);
  const { startOfDay, endOfDay } = dayBoundsInTimezone(year, month, day);
  const { totalCapacity } = await getOrganizationCapacity(prisma, organizationId, locationId);
  const appointmentWhere = {
    organizationId,
    scheduledStart: { gte: startOfDay, lte: endOfDay },
    status: { notIn: ['CANCELLED'] },
  };
  if (locationId) appointmentWhere.locationId = locationId;

  const existingAppointments = await prisma.appointment.findMany({
    where: appointmentWhere,
    select: {
      scheduledStart: true,
      scheduledEnd: true,
      resourceId: true,
      locationId: true,
    },
  });

  const workStart = settings?.workingHours?.start ?? DEFAULT_WORK_START;
  const workEnd = settings?.workingHours?.end ?? DEFAULT_WORK_END;
  const slots = [];

  for (let hour = workStart; hour < workEnd; hour++) {
    for (let minute = 0; minute < 60; minute += DEFAULT_SLOT_INTERVAL) {
      const slotStart = dateInTimezone(year, month, day, hour, minute);
      const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);
      const endHour = hour + Math.floor((minute + duration) / 60);
      const endMinute = (minute + duration) % 60;

      if (endHour > workEnd || (endHour === workEnd && endMinute > 0)) continue;
      if (slotStart < new Date()) continue;

      const overlappingCount = existingAppointments.filter((appointment) => {
        const appointmentStart = new Date(appointment.scheduledStart);
        const appointmentEnd = new Date(appointment.scheduledEnd);
        return (
          (slotStart >= appointmentStart && slotStart < appointmentEnd) ||
          (slotEnd > appointmentStart && slotEnd <= appointmentEnd) ||
          (slotStart <= appointmentStart && slotEnd >= appointmentEnd)
        );
      }).length;
      const availableCapacity = totalCapacity - overlappingCount;

      if (availableCapacity > 0) {
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          formatted: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
          availableCapacity,
        });
      }
    }
  }

  return slots;
};

const getAvailableDates = async (prisma, { days = 30, settings = null }) => {
  const dates = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const allowWeekends = settings?.allowWeekends ?? false;

  for (let index = 0; index < days; index++) {
    const date = new Date(today);
    date.setDate(date.getDate() + index);
    const dayOfWeek = date.getDay();
    if (!allowWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) continue;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    dates.push({
      date: `${year}-${month}-${day}`,
      dayOfWeek: date.toLocaleDateString('ro-RO', { weekday: 'long' }),
      formatted: date.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' }),
    });
  }

  return dates;
};

module.exports = {
  getAvailableDates,
  getAvailableSlots,
  getOrganizationBySlug,
};
