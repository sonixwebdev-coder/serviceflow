const { upsertServiceOrder, generateServiceOrderPdf } = require('../services/serviceOrderService');
const prisma = require('../../lib/prisma');
const { buildServiceOrderPdf } = require('../utils/pdf');
const storage = require('../utils/storage');
const { broadcastServiceOrder } = require('../realtime/events');
const { getCompanySettings } = require('../services/companySettingService');

jest.mock('../../lib/prisma', () => ({
  appointment: { findUnique: jest.fn() },
  serviceOrder: {
    count: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
  organizationProfile: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
}));

jest.mock('../utils/pdf', () => ({
  buildServiceOrderPdf: jest.fn(),
}));

jest.mock('../utils/storage', () => ({
  writeFile: jest.fn(),
  readFile: jest.fn(),
  removeFile: jest.fn(),
  exists: jest.fn(),
}));

jest.mock('../services/companySettingService', () => ({
  getCompanySettings: jest.fn(),
}));

jest.mock('../realtime/events', () => ({
  broadcastServiceOrder: jest.fn(),
}));

jest.mock('../utils/transform', () => ({
  mapUser: jest.fn((user) => (user ? { id: user.id, firstName: user.firstName, lastName: user.lastName } : null)),
}));

describe('serviceOrderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCompanySettings.mockResolvedValue({
      companyName: 'ViperX Automotive',
      vatNumber: 'RO1234567',
    });
  });

  const appointment = {
    id: 'appt1',
    title: 'Test Appointment',
    scheduledStart: new Date('2025-01-01T10:00:00Z').toISOString(),
    scheduledEnd: new Date('2025-01-01T11:00:00Z').toISOString(),
    location: 'HQ',
    assignees: [{ userId: 'user1', user: { id: 'user1', firstName: 'Jane', lastName: 'Doe' } }],
    client: {
      id: 'client1',
      firstName: 'John',
      lastName: 'Client',
      phone: '+40 712 000 000',
      email: 'client@example.com',
    },
  };

  it('creates a new service order, calculates totals, and persists a PDF', async () => {
    prisma.appointment.findUnique.mockResolvedValue(appointment);
    prisma.serviceOrder.findUnique.mockResolvedValue(null);
    prisma.serviceOrder.count.mockResolvedValue(0);

    const createdOrder = {
      id: 'order1',
      appointmentId: 'appt1',
      orderNumber: 'SO-00001',
      status: 'DRAFT',
      subtotal: 120,
      tax: 0,
      total: 120,
      notes: null,
      metadata: null,
      pdfUrl: 'service-orders/appt1/SO-00001.pdf',
      lineItems: [
        {
          id: 'li1',
          name: 'Labor',
          description: null,
          quantity: 2,
          unitPrice: 60,
          totalPrice: 120,
        },
      ],
      appointment,
    };

    prisma.serviceOrder.upsert.mockResolvedValue(createdOrder);
    buildServiceOrderPdf.mockResolvedValue(Buffer.from('PDF', 'utf8'));
    storage.writeFile.mockResolvedValue('/tmp/service-orders/appt1/SO-00001.pdf');

    const payload = {
      lineItems: [{ name: 'Labor', quantity: 2, unitPrice: 60 }],
    };

    const result = await upsertServiceOrder('appt1', payload);

    expect(prisma.serviceOrder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          subtotal: 120,
          total: 120,
          pdfUrl: 'service-orders/appt1/SO-00001.pdf',
        }),
      })
    );
    expect(storage.writeFile).toHaveBeenCalledWith(
      'service-orders/appt1/SO-00001.pdf',
      expect.any(Buffer)
    );
    expect(buildServiceOrderPdf).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'order1' }),
      expect.objectContaining({ companyName: 'ViperX Automotive' })
    );
    expect(broadcastServiceOrder).toHaveBeenCalledWith(
      'created',
      expect.objectContaining({ id: 'order1', appointmentId: 'appt1' })
    );
    expect(result.total).toBe(120);
  });

  it('returns cached PDF when available', async () => {
    prisma.serviceOrder.findUnique.mockResolvedValue({
      id: 'order2',
      appointmentId: 'appt1',
      orderNumber: 'SO-00002',
      pdfUrl: 'service-orders/appt1/SO-00002.pdf',
      appointment,
      lineItems: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      notes: null,
      metadata: null,
    });
    storage.exists.mockResolvedValue(true);
    storage.readFile.mockResolvedValue(Buffer.from('cached', 'utf8'));

    const { buffer, filename } = await generateServiceOrderPdf('appt1');

    expect(storage.exists).toHaveBeenCalledWith('service-orders/appt1/SO-00002.pdf');
    expect(storage.readFile).toHaveBeenCalledWith('service-orders/appt1/SO-00002.pdf');
    expect(buildServiceOrderPdf).not.toHaveBeenCalled();
    expect(buffer.toString()).toBe('cached');
    expect(filename).toBe('SO-00002.pdf');
  });

  it('refreshes PDF when requested', async () => {
    prisma.serviceOrder.findUnique.mockResolvedValue({
      id: 'order3',
      appointmentId: 'appt1',
      orderNumber: 'SO-00003',
      pdfUrl: 'service-orders/appt1/SO-00003.pdf',
      appointment,
      lineItems: [],
      subtotal: 0,
      tax: 0,
      total: 0,
      notes: null,
      metadata: null,
    });
    storage.exists.mockResolvedValue(true);
    buildServiceOrderPdf.mockResolvedValue(Buffer.from('fresh', 'utf8'));
    storage.writeFile.mockResolvedValue('/tmp/service-orders/appt1/SO-00003.pdf');

    const { buffer } = await generateServiceOrderPdf('appt1', { refresh: true });

    expect(buildServiceOrderPdf).toHaveBeenCalled();
    expect(storage.writeFile).toHaveBeenCalledWith(
      'service-orders/appt1/SO-00003.pdf',
      expect.any(Buffer)
    );
    expect(buffer.toString()).toBe('fresh');
  });
});
