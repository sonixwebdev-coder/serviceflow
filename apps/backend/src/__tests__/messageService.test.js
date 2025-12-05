const { listMessages, createMessage } = require('../services/messageService');
const prisma = require('../../lib/prisma');
const { broadcastMessage } = require('../realtime/events');
const { AppError } = require('../utils/errors');

jest.mock('../../lib/prisma', () => ({
  appointment: { findUnique: jest.fn() },
  message: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../utils/transform', () => ({
  mapUser: jest.fn((user) => (user ? { id: user.id, firstName: user.firstName, lastName: user.lastName } : null)),
}));

jest.mock('../realtime/events', () => ({
  broadcastMessage: jest.fn(),
}));

describe('messageService', () => {
  const baseAppointment = {
    id: 'appt1',
    assignees: [{ userId: 'user1' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists messages for authorized assignee', async () => {
    const now = new Date();
    prisma.appointment.findUnique.mockResolvedValue(baseAppointment);
    prisma.message.findMany.mockResolvedValue([
      {
        id: 'msg1',
        appointmentId: 'appt1',
        authorId: 'user1',
        body: 'Hello',
        type: 'TEXT',
        metadata: null,
        createdAt: now,
        updatedAt: now,
        author: { id: 'user1', firstName: 'Jane', lastName: 'Doe' },
      },
    ]);

    const result = await listMessages('appt1', { id: 'user1', roles: [] });

    expect(prisma.appointment.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'appt1' } })
    );
    expect(prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { appointmentId: 'appt1' } })
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'msg1',
      body: 'Hello',
      type: 'text',
      author: expect.objectContaining({ id: 'user1' }),
    });
  });

  it('throws when user lacks access', async () => {
    prisma.appointment.findUnique.mockResolvedValue(baseAppointment);

    await expect(
      listMessages('appt1', { id: 'someone-else', roles: [] })
    ).rejects.toBeInstanceOf(AppError);
  });

  it('creates a message and broadcasts it', async () => {
    const now = new Date();
    prisma.appointment.findUnique.mockResolvedValue(baseAppointment);
    prisma.message.create.mockResolvedValue({
      id: 'msg2',
      appointmentId: 'appt1',
      authorId: 'user1',
      body: 'Update',
      type: 'STATUS',
      metadata: { kind: 'status' },
      createdAt: now,
      updatedAt: now,
      author: { id: 'user1', firstName: 'Jane', lastName: 'Doe' },
    });

    const payload = await createMessage('appt1', { id: 'user1', roles: [] }, { body: 'Update', type: 'status' });

    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          appointmentId: 'appt1',
          authorId: 'user1',
          body: 'Update',
          type: 'STATUS',
        }),
      })
    );
    const broadcastPayload = broadcastMessage.mock.calls[0][1];
    expect(broadcastPayload).toMatchObject({ id: 'msg2', type: 'status' });
    expect(payload.body).toBe('Update');
  });

  it('rejects messages without body', async () => {
    await expect(
      createMessage('appt1', { id: 'user1', roles: [] }, { body: '   ' })
    ).rejects.toBeInstanceOf(AppError);
  });
});
