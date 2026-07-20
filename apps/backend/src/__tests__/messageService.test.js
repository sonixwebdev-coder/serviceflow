const messageService = require('../services/messageService');
const prisma = require('../../lib/prisma');
const { broadcastMessage } = require('../realtime/events');
const { AppError } = require('../utils/errors');

jest.mock('../../lib/prisma', () => ({
  appointment: { findFirst: jest.fn(), findUnique: jest.fn() },
  message: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
}));

const listMessages = (...args) => messageService.listMessages(prisma, ...args);
const createMessage = (...args) => messageService.createMessage(prisma, ...args);

jest.mock('../utils/transform', () => ({
  mapUser: jest.fn((user) =>
    user ? { id: user.id, firstName: user.firstName, lastName: user.lastName } : null
  ),
}));

jest.mock('../realtime/events', () => ({
  broadcastMessage: jest.fn(),
}));

describe('messageService', () => {
  const baseAppointment = {
    id: 'appt1',
    organizationId: 'org1',
    clientId: null,
    assignees: [{ userId: 'user1' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists messages for authorized assignee', async () => {
    const now = new Date();
    prisma.appointment.findFirst.mockResolvedValue(baseAppointment);
    prisma.message.findMany.mockResolvedValue([
      {
        id: 'msg1',
        appointmentId: 'appt1',
        authorId: 'user1',
        body: 'Hello',
        type: 'TEXT',
        metadata: null,
        attachments: [],
        readReceipts: [],
        createdAt: now,
        updatedAt: now,
        author: { id: 'user1', firstName: 'Jane', lastName: 'Doe' },
      },
    ]);

    const result = await listMessages('appt1', { id: 'user1', roles: [] });

    expect(prisma.appointment.findFirst).toHaveBeenCalledWith(
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

  it('preserves client authors, attachments, and read-receipt presentation', async () => {
    const now = new Date();
    prisma.appointment.findFirst.mockResolvedValue(baseAppointment);
    prisma.message.findMany.mockResolvedValue([
      {
        id: 'msg-client',
        appointmentId: 'appt1',
        authorId: null,
        clientAuthorId: 'client1',
        clientAuthor: {
          id: 'client1',
          firstName: null,
          lastName: null,
          companyName: 'Example Client SRL',
          email: 'client@example.com',
        },
        body: 'See attachment',
        type: 'FILE',
        metadata: { source: 'portal' },
        attachments: [
          {
            id: 'attachment1',
            fileName: 'photo.jpg',
            fileUrl: '/storage/chat/photo.jpg',
            fileType: 'image/jpeg',
            fileSize: 1234,
            internalField: 'not exposed',
          },
        ],
        readReceipts: [
          {
            id: 'receipt1',
            userId: 'user1',
            clientId: null,
            readAt: now,
            user: { id: 'user1' },
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const [message] = await listMessages('appt1', { id: 'user1', roles: [] });

    expect(message).toMatchObject({
      id: 'msg-client',
      type: 'file',
      isRead: true,
      author: {
        id: 'client1',
        _id: 'client1',
        firstName: 'Example Client SRL',
        lastName: '',
        type: 'client',
      },
      attachments: [
        {
          id: 'attachment1',
          fileName: 'photo.jpg',
          fileUrl: '/storage/chat/photo.jpg',
          fileType: 'image/jpeg',
          fileSize: 1234,
        },
      ],
      readReceipts: [
        {
          id: 'receipt1',
          userId: 'user1',
          clientId: null,
          readAt: now,
        },
      ],
    });
    expect(message.attachments[0]).not.toHaveProperty('internalField');
    expect(message.readReceipts[0]).not.toHaveProperty('user');
  });

  it('throws when user lacks access', async () => {
    prisma.appointment.findFirst.mockResolvedValue(baseAppointment);

    await expect(listMessages('appt1', { id: 'someone-else', roles: [] })).rejects.toBeInstanceOf(
      AppError
    );
  });

  it('creates a message and broadcasts it', async () => {
    const now = new Date();
    prisma.appointment.findFirst.mockResolvedValue(baseAppointment);
    prisma.message.create.mockResolvedValue({
      id: 'msg2',
      appointmentId: 'appt1',
      authorId: 'user1',
      body: 'Update',
      type: 'STATUS',
      metadata: { kind: 'status' },
      attachments: [],
      readReceipts: [],
      createdAt: now,
      updatedAt: now,
      author: { id: 'user1', firstName: 'Jane', lastName: 'Doe' },
    });

    const payload = await createMessage(
      'appt1',
      { id: 'user1', roles: [] },
      { body: 'Update', type: 'status' }
    );

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
    const broadcastPayload = broadcastMessage.mock.calls[0][2];
    expect(broadcastPayload).toMatchObject({ id: 'msg2', type: 'status' });
    expect(payload.body).toBe('Update');
  });

  it('rejects messages without body', async () => {
    await expect(
      createMessage('appt1', { id: 'user1', roles: [] }, { body: '   ' })
    ).rejects.toBeInstanceOf(AppError);
  });
});
