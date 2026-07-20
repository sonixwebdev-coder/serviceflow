/**
 * Integration Tests for Export Service
 * Tests complete export workflows for all entities and formats
 */

const exportService = require('../../services/exportService');
const prisma = require('../../../lib/prisma');
const { assertValidExportFile } = require('../helpers/exportHelpers');
const {
  mockAppointments,
  mockInvoices,
  mockClients,
  mockUsers,
  mockLeaveRequests,
  mockTimeTracking,
  mockTasks,
  mockUserRoles,
} = require('../fixtures/exportFixtures');

const exportAppointments = (...args) => exportService.exportAppointments(prisma, ...args);
const exportInvoices = (...args) => exportService.exportInvoices(prisma, ...args);
const exportClients = (...args) => exportService.exportClients(prisma, ...args);
const exportUsers = (...args) => exportService.exportUsers(prisma, ...args);
const exportLeaveRequests = (...args) => exportService.exportLeaveRequests(prisma, ...args);
const exportTimeTracking = (...args) => exportService.exportTimeTracking(prisma, ...args);
const exportTasks = (...args) => exportService.exportTasks(prisma, ...args);
const exportAllData = (...args) => exportService.exportAllData(prisma, ...args);

// Mock Prisma
jest.mock('../../../lib/prisma', () => ({
  appointment: {
    findMany: jest.fn(),
  },
  invoice: {
    findMany: jest.fn(),
  },
  client: {
    findMany: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
  },
  timeOffRequest: {
    findMany: jest.fn(),
  },
  timeEntry: {
    findMany: jest.fn(),
  },
  task: {
    findMany: jest.fn(),
  },
}));

describe('Export Service - exportAppointments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports appointments in CSV format', async () => {
    prisma.appointment.findMany.mockResolvedValue(mockAppointments);

    const result = await exportAppointments('csv', {}, 'user-1', mockUserRoles.admin);

    expect(result).toHaveProperty('buffer');
    expect(result).toHaveProperty('filename');
    expect(result).toHaveProperty('contentType');
    expect(result.contentType).toBe('text/csv; charset=utf-8');
    expect(result.filename).toMatch(/programari_\d{4}-\d{2}-\d{2}.*\.csv$/);
    await assertValidExportFile(result.buffer, 'csv');
  });

  it('exports appointments in Excel format', async () => {
    prisma.appointment.findMany.mockResolvedValue(mockAppointments);

    const result = await exportAppointments('excel', {}, 'user-1', mockUserRoles.admin);

    expect(result.contentType).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    expect(result.filename).toMatch(/\.xlsx$/);
    await assertValidExportFile(result.buffer, 'excel');
  });

  it('exports appointments in JSON format', async () => {
    prisma.appointment.findMany.mockResolvedValue(mockAppointments);

    const result = await exportAppointments('json', {}, 'user-1', mockUserRoles.admin);

    expect(result.contentType).toBe('application/json; charset=utf-8');
    expect(result.filename).toMatch(/\.json$/);
    await assertValidExportFile(result.buffer, 'json');
  });

  it('exports appointments in XML format', async () => {
    prisma.appointment.findMany.mockResolvedValue(mockAppointments);

    const result = await exportAppointments('xml', {}, 'user-1', mockUserRoles.admin);

    expect(result.contentType).toBe('application/xml; charset=utf-8');
    expect(result.filename).toMatch(/\.xml$/);
    await assertValidExportFile(result.buffer, 'xml');
  });

  it('applies status filter', async () => {
    prisma.appointment.findMany.mockResolvedValue([mockAppointments[0]]);

    await exportAppointments('csv', { status: 'COMPLETED' }, 'user-1', mockUserRoles.admin);

    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'COMPLETED',
        }),
      })
    );
  });

  it('applies date range filter', async () => {
    prisma.appointment.findMany.mockResolvedValue(mockAppointments);

    await exportAppointments(
      'csv',
      {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      },
      'user-1',
      mockUserRoles.admin
    );

    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          scheduledStart: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      })
    );
  });

  it('applies search filter', async () => {
    prisma.appointment.findMany.mockResolvedValue(mockAppointments);

    await exportAppointments('csv', { search: 'revizie' }, 'user-1', mockUserRoles.admin);

    expect(prisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([expect.objectContaining({ title: expect.anything() })]),
        }),
      })
    );
  });

  it('throws error for invalid format', async () => {
    await expect(exportAppointments('invalid', {}, 'user-1', mockUserRoles.admin)).rejects.toThrow(
      'Invalid export format'
    );
  });

  it('throws error when no appointments found', async () => {
    prisma.appointment.findMany.mockResolvedValue([]);

    await expect(exportAppointments('csv', {}, 'user-1', mockUserRoles.admin)).rejects.toThrow(
      'No appointments found'
    );
  });

  it('allows admin to export all appointments', async () => {
    prisma.appointment.findMany.mockResolvedValue(mockAppointments);

    await expect(
      exportAppointments('csv', {}, 'admin-1', mockUserRoles.admin)
    ).resolves.toBeDefined();
  });

  it('rejects manager-wide exports without an explicit self scope', async () => {
    prisma.appointment.findMany.mockResolvedValue(mockAppointments);

    await expect(exportAppointments('csv', {}, 'manager-1', mockUserRoles.manager)).rejects.toThrow(
      'Insufficient permissions'
    );
  });
});

describe('Export Service - exportInvoices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports invoices in all formats', async () => {
    prisma.invoice.findMany.mockResolvedValue(mockInvoices);

    const formats = ['csv', 'excel', 'json', 'xml'];

    for (const format of formats) {
      const result = await exportInvoices(format, {}, 'user-1', mockUserRoles.admin);
      expect(result.buffer).toBeInstanceOf(Buffer);
      await assertValidExportFile(result.buffer, format);
    }
  });

  it('applies status filter', async () => {
    prisma.invoice.findMany.mockResolvedValue([mockInvoices[0]]);

    await exportInvoices('csv', { status: 'PAID' }, 'user-1', mockUserRoles.admin);

    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'PAID',
        }),
      })
    );
  });

  it('filters by client ID', async () => {
    prisma.invoice.findMany.mockResolvedValue([mockInvoices[0]]);

    await exportInvoices('csv', { clientId: 1 }, 'user-1', mockUserRoles.admin);

    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clientId: 1,
        }),
      })
    );
  });

  it('throws error when no invoices found', async () => {
    prisma.invoice.findMany.mockResolvedValue([]);

    await expect(exportInvoices('csv', {}, 'user-1', mockUserRoles.admin)).rejects.toThrow(
      'No invoices found'
    );
  });
});

describe('Export Service - exportClients', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports clients in all formats', async () => {
    prisma.client.findMany.mockResolvedValue(mockClients);

    const formats = ['csv', 'excel', 'json', 'xml'];

    for (const format of formats) {
      const result = await exportClients(format, {}, 'user-1', mockUserRoles.admin);
      await assertValidExportFile(result.buffer, format);
    }
  });

  it('filters by client type', async () => {
    prisma.client.findMany.mockResolvedValue(mockClients.filter((c) => c.type === 'PF'));

    await exportClients('csv', { type: 'PF' }, 'user-1', mockUserRoles.admin);

    expect(prisma.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: 'PF',
        }),
      })
    );
  });

  it('applies search filter', async () => {
    prisma.client.findMany.mockResolvedValue([mockClients[0]]);

    await exportClients('csv', { search: 'popescu' }, 'user-1', mockUserRoles.admin);

    expect(prisma.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.any(Array),
        }),
      })
    );
  });
});

describe('Export Service - exportUsers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports users without password field', async () => {
    prisma.user.findMany.mockResolvedValue(mockUsers);

    const result = await exportUsers('json', {}, 'user-1', mockUserRoles.admin);

    const jsonString = result.buffer.toString('utf8');
    const parsed = JSON.parse(jsonString);

    // Ensure password is not included
    parsed.data.forEach((user) => {
      expect(user).not.toHaveProperty('password');
    });
  });

  it('rejects user exports for non-admin users', async () => {
    prisma.user.findMany.mockResolvedValue([mockUsers[1]]);

    await expect(exportUsers('csv', {}, 'user-2', mockUserRoles.technician)).rejects.toThrow(
      'Insufficient permissions'
    );
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('allows admin to export all users', async () => {
    prisma.user.findMany.mockResolvedValue(mockUsers);

    await exportUsers('csv', {}, 'admin-1', mockUserRoles.admin);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({
          id: expect.anything(),
        }),
      })
    );
  });

  it('filters by employment type', async () => {
    prisma.user.findMany.mockResolvedValue(mockUsers);

    await exportUsers('csv', { employmentType: 'FULL_TIME' }, 'admin-1', mockUserRoles.admin);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          employmentType: 'FULL_TIME',
        }),
      })
    );
  });

  it('filters by active status', async () => {
    prisma.user.findMany.mockResolvedValue(mockUsers.filter((u) => u.isActive));

    await exportUsers('csv', { isActive: 'true' }, 'admin-1', mockUserRoles.admin);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
        }),
      })
    );
  });
});

describe('Export Service - exportLeaveRequests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports leave requests in all formats', async () => {
    prisma.timeOffRequest.findMany.mockResolvedValue(mockLeaveRequests);

    const formats = ['csv', 'excel', 'json', 'xml'];

    for (const format of formats) {
      const result = await exportLeaveRequests(format, {}, 'user-1', mockUserRoles.admin);
      await assertValidExportFile(result.buffer, format);
    }
  });

  it('rejects leave-request exports for employees', async () => {
    prisma.timeOffRequest.findMany.mockResolvedValue([mockLeaveRequests[0]]);

    await expect(exportLeaveRequests('csv', {}, 'user-2', mockUserRoles.employee)).rejects.toThrow(
      'Insufficient permissions'
    );
    expect(prisma.timeOffRequest.findMany).not.toHaveBeenCalled();
  });

  it('filters by leave type', async () => {
    prisma.timeOffRequest.findMany.mockResolvedValue([mockLeaveRequests[0]]);

    await exportLeaveRequests('csv', { leaveType: 'VACATION' }, 'admin-1', mockUserRoles.admin);

    expect(prisma.timeOffRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          leaveType: 'VACATION',
        }),
      })
    );
  });

  it('filters by status', async () => {
    prisma.timeOffRequest.findMany.mockResolvedValue([mockLeaveRequests[0]]);

    await exportLeaveRequests('csv', { status: 'APPROVED' }, 'admin-1', mockUserRoles.admin);

    expect(prisma.timeOffRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'APPROVED',
        }),
      })
    );
  });
});

describe('Export Service - exportTimeTracking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports time tracking entries', async () => {
    prisma.timeEntry.findMany.mockResolvedValue(mockTimeTracking);

    const result = await exportTimeTracking('csv', {}, 'admin-1', mockUserRoles.admin);
    await assertValidExportFile(result.buffer, 'csv');
  });

  it('rejects time-tracking exports for employees', async () => {
    prisma.timeEntry.findMany.mockResolvedValue([mockTimeTracking[0]]);

    await expect(exportTimeTracking('csv', {}, 'user-2', mockUserRoles.employee)).rejects.toThrow(
      'Insufficient permissions'
    );
    expect(prisma.timeEntry.findMany).not.toHaveBeenCalled();
  });

  it('applies date range filter', async () => {
    prisma.timeEntry.findMany.mockResolvedValue(mockTimeTracking);

    await exportTimeTracking(
      'csv',
      {
        startDate: '2024-02-01',
        endDate: '2024-02-28',
      },
      'admin-1',
      mockUserRoles.admin
    );

    expect(prisma.timeEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clockIn: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      })
    );
  });
});

describe('Export Service - exportTasks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports tasks in all formats', async () => {
    prisma.task.findMany.mockResolvedValue(mockTasks);

    const formats = ['csv', 'excel', 'json', 'xml'];

    for (const format of formats) {
      const result = await exportTasks(format, {}, 'admin-1', mockUserRoles.admin);
      await assertValidExportFile(result.buffer, format);
    }
  });

  it('filters by status', async () => {
    prisma.task.findMany.mockResolvedValue([mockTasks[0]]);

    await exportTasks('csv', { status: 'COMPLETED' }, 'admin-1', mockUserRoles.admin);

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'COMPLETED',
        }),
      })
    );
  });

  it('filters by priority', async () => {
    prisma.task.findMany.mockResolvedValue([mockTasks[0]]);

    await exportTasks('csv', { priority: 'HIGH' }, 'admin-1', mockUserRoles.admin);

    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          priority: 'HIGH',
        }),
      })
    );
  });
});

describe('Export Service - exportAllData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock all entity queries
    prisma.appointment.findMany.mockResolvedValue(mockAppointments);
    prisma.invoice.findMany.mockResolvedValue(mockInvoices);
    prisma.client.findMany.mockResolvedValue(mockClients);
    prisma.user.findMany.mockResolvedValue(mockUsers);
    prisma.timeOffRequest.findMany.mockResolvedValue(mockLeaveRequests);
    prisma.timeEntry.findMany.mockResolvedValue(mockTimeTracking);
    prisma.task.findMany.mockResolvedValue(mockTasks);
  });

  it('exports all data as ZIP for admin', async () => {
    const result = await exportAllData('admin-1', mockUserRoles.admin);

    expect(result.contentType).toBe('application/zip');
    expect(result.filename).toMatch(/export_complet.*\.zip$/);
    await assertValidExportFile(result.buffer, 'zip');
  });

  it('rejects non-admin users', async () => {
    await expect(exportAllData('user-1', mockUserRoles.technician)).rejects.toThrow(
      'Only administrators can export all data'
    );
  });

  it('includes all entities in ZIP', async () => {
    const result = await exportAllData('admin-1', mockUserRoles.admin);

    const AdmZip = require('adm-zip');
    const zip = new AdmZip(result.buffer);
    const entries = zip.getEntries();

    // Should have metadata.json + 7 entity files
    expect(entries.length).toBeGreaterThanOrEqual(7);

    const fileNames = entries.map((e) => e.entryName);
    expect(fileNames).toContain('metadata.json');
  });

  it('handles entities with no data', async () => {
    prisma.appointment.findMany.mockResolvedValue([]);
    prisma.invoice.findMany.mockResolvedValue(mockInvoices);

    // Should still succeed with partial data
    const result = await exportAllData('admin-1', mockUserRoles.admin);
    expect(result.buffer).toBeInstanceOf(Buffer);
  });

  it('produces a metadata-only archive when no entity data is available', async () => {
    // Mock all queries to return empty arrays
    prisma.appointment.findMany.mockResolvedValue([]);
    prisma.invoice.findMany.mockResolvedValue([]);
    prisma.client.findMany.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue([]);
    prisma.timeOffRequest.findMany.mockResolvedValue([]);
    prisma.timeEntry.findMany.mockResolvedValue([]);
    prisma.task.findMany.mockResolvedValue([]);

    const result = await exportAllData('admin-1', mockUserRoles.admin);
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.contentType).toBe('application/zip');
  });
});

describe('Export Service - Authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws error for unauthenticated requests', async () => {
    await expect(exportAppointments('csv', {}, null, [])).rejects.toThrow(
      'Invalid user authentication'
    );
  });

  it('rejects restricted entity exports for managers', async () => {
    prisma.user.findMany.mockResolvedValue(mockUsers);

    await expect(exportUsers('csv', {}, 'manager-1', mockUserRoles.manager)).rejects.toThrow(
      'Insufficient permissions'
    );
  });

  it('rejects user exports for technicians', async () => {
    prisma.user.findMany.mockResolvedValue([mockUsers[1]]);

    await expect(exportUsers('csv', {}, 'tech-1', mockUserRoles.technician)).rejects.toThrow(
      'Insufficient permissions'
    );
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });
});
