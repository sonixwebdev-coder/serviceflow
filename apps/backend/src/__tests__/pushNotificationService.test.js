const webpush = require('web-push');
const prisma = require('../../lib/prisma');
const logger = require('../utils/logger');
const pushNotificationService = require('../services/pushNotificationService');

jest.mock('web-push', () => ({
  sendNotification: jest.fn(),
  setVapidDetails: jest.fn(),
}));

jest.mock('../../lib/prisma', () => ({
  notificationPreference: {
    create: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  pushSubscription: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../utils/logger', () => ({
  error: jest.fn(),
}));

jest.mock('../config/platform', () => ({
  getPlatformConfig: jest.fn(() => ({ contactEmail: 'support@example.com' })),
}));

const enabledPreferences = {
  enablePushNotifications: true,
  enableAppointments: true,
  enableLeaveRequests: true,
  enableTasks: true,
  enableReminders: true,
  enableMessages: true,
};

describe('pushNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.notificationPreference.findUnique.mockResolvedValue(enabledPreferences);
    prisma.pushSubscription.findMany.mockResolvedValue([]);
  });

  it('updates an inactive subscription but retains the existing return contract', async () => {
    const existing = {
      id: 'subscription-1',
      endpoint: 'https://push.example/subscription-1',
      userId: 'old-user',
      isActive: false,
    };
    const keys = { p256dh: 'public-key', auth: 'auth-secret' };
    prisma.pushSubscription.findUnique.mockResolvedValue(existing);
    prisma.pushSubscription.update.mockResolvedValue({ ...existing, userId: 'user-1' });

    const result = await pushNotificationService.subscribeToPush('user-1', {
      endpoint: existing.endpoint,
      keys,
    });

    expect(prisma.pushSubscription.update).toHaveBeenCalledWith({
      where: { endpoint: existing.endpoint },
      data: {
        userId: 'user-1',
        keys,
        isActive: true,
        updatedAt: expect.any(Date),
      },
    });
    expect(result).toBe(existing);
  });

  it('creates subscriptions and maps duplicate endpoint errors to the existing AppError', async () => {
    const subscription = {
      endpoint: 'https://push.example/subscription-1',
      keys: { p256dh: 'public-key', auth: 'auth-secret' },
    };
    const created = { id: 'subscription-1', ...subscription, userId: 'user-1', isActive: true };
    prisma.pushSubscription.findUnique.mockResolvedValue(null);
    prisma.pushSubscription.create.mockResolvedValueOnce(created);

    await expect(pushNotificationService.subscribeToPush('user-1', subscription)).resolves.toBe(
      created
    );
    expect(prisma.pushSubscription.create).toHaveBeenCalledWith({
      data: { userId: 'user-1', ...subscription, isActive: true },
    });

    prisma.pushSubscription.create.mockRejectedValueOnce({ code: 'P2002' });
    await expect(pushNotificationService.subscribeToPush('user-1', subscription)).rejects.toEqual(
      expect.objectContaining({
        name: 'AppError',
        message: 'Subscription already exists',
        status: 409,
      })
    );
  });

  it('uses the existing subscription and preference Prisma contracts', async () => {
    prisma.pushSubscription.findFirst.mockResolvedValue({ id: 'subscription-1' });
    prisma.pushSubscription.update.mockResolvedValue({});

    await expect(
      pushNotificationService.unsubscribeFromPush('user-1', 'https://push.example/subscription-1')
    ).resolves.toEqual({ success: true });
    expect(prisma.pushSubscription.findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        endpoint: 'https://push.example/subscription-1',
      },
    });
    expect(prisma.pushSubscription.update).toHaveBeenCalledWith({
      where: { id: 'subscription-1' },
      data: { isActive: false },
    });

    prisma.notificationPreference.findUnique.mockResolvedValueOnce(null);
    prisma.notificationPreference.create.mockResolvedValueOnce({
      userId: 'user-2',
      enablePushNotifications: true,
    });
    await pushNotificationService.getNotificationPreferences('user-2');
    expect(prisma.notificationPreference.create).toHaveBeenCalledWith({
      data: { userId: 'user-2' },
    });

    const updates = { enableTasks: false };
    prisma.notificationPreference.upsert.mockResolvedValue({ userId: 'user-2', ...updates });
    await pushNotificationService.updateNotificationPreferences('user-2', updates);
    expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-2' },
      update: updates,
      create: { userId: 'user-2', ...updates },
    });
  });

  it('delivers serialized payloads and deactivates subscriptions rejected as gone', async () => {
    const payload = { title: 'Test', data: { type: 'test' } };
    prisma.pushSubscription.findMany.mockResolvedValue([
      {
        id: 'subscription-1',
        endpoint: 'https://push.example/subscription-1',
        keys: { p256dh: 'key-1', auth: 'auth-1' },
      },
      {
        id: 'subscription-2',
        endpoint: 'https://push.example/subscription-2',
        keys: { p256dh: 'key-2', auth: 'auth-2' },
      },
    ]);
    webpush.sendNotification.mockImplementation(({ endpoint }) => {
      if (endpoint.endsWith('subscription-2')) {
        return Promise.reject({ statusCode: 410, message: 'Subscription expired' });
      }
      return Promise.resolve();
    });
    prisma.pushSubscription.update.mockResolvedValue({});

    const result = await pushNotificationService.sendPushToUser('user-1', payload);

    expect(webpush.sendNotification).toHaveBeenNthCalledWith(
      1,
      {
        endpoint: 'https://push.example/subscription-1',
        keys: { p256dh: 'key-1', auth: 'auth-1' },
      },
      JSON.stringify(payload)
    );
    expect(webpush.sendNotification).toHaveBeenNthCalledWith(
      2,
      {
        endpoint: 'https://push.example/subscription-2',
        keys: { p256dh: 'key-2', auth: 'auth-2' },
      },
      JSON.stringify(payload)
    );
    expect(prisma.pushSubscription.update).toHaveBeenCalledWith({
      where: { id: 'subscription-2' },
      data: { isActive: false },
    });
    expect(result).toEqual({ sent: 1, failed: 1, total: 2 });
  });

  it('keeps the disabled-preference short-circuit response', async () => {
    prisma.notificationPreference.findUnique.mockResolvedValue({
      ...enabledPreferences,
      enablePushNotifications: false,
    });

    await expect(pushNotificationService.sendPushToUser('user-1', {})).resolves.toEqual({
      sent: 0,
      failed: 0,
    });
    expect(prisma.pushSubscription.findMany).not.toHaveBeenCalled();
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it('aggregates successful users and rejected user lookups', async () => {
    prisma.notificationPreference.findUnique.mockImplementation(({ where: { userId } }) => {
      if (userId === 'user-2') return Promise.reject(new Error('preference lookup failed'));
      return Promise.resolve(enabledPreferences);
    });
    prisma.pushSubscription.findMany.mockResolvedValue([
      {
        id: 'subscription-1',
        endpoint: 'https://push.example/subscription-1',
        keys: { p256dh: 'public-key', auth: 'auth-secret' },
      },
    ]);
    webpush.sendNotification.mockResolvedValue();

    await expect(
      pushNotificationService.sendPushToUsers(['user-1', 'user-2'], { title: 'Test' })
    ).resolves.toEqual({
      sent: 1,
      failed: 0,
      errors: ['preference lookup failed'],
    });
  });

  it('sends the existing task payload to every eligible assignee', async () => {
    prisma.pushSubscription.findMany.mockResolvedValue([
      {
        id: 'subscription-1',
        endpoint: 'https://push.example/subscription-1',
        keys: { p256dh: 'public-key', auth: 'auth-secret' },
      },
    ]);
    webpush.sendNotification.mockResolvedValue();

    await pushNotificationService.sendTaskNotification(
      {
        id: 'task-1',
        title: 'Pregateste oferta',
        assignees: [{ userId: 'user-1' }, { userId: null }],
      },
      'comment'
    );

    expect(webpush.sendNotification).toHaveBeenCalledWith(
      {
        endpoint: 'https://push.example/subscription-1',
        keys: { p256dh: 'public-key', auth: 'auth-secret' },
      },
      JSON.stringify({
        title: 'Comentariu nou',
        body: 'Comentariu nou la task-ul "Pregateste oferta"',
        icon: '/icons/task.png',
        badge: '/icons/badge.png',
        data: {
          type: 'task',
          taskId: 'task-1',
          url: '/tasks?id=task-1',
        },
      })
    );
    expect(prisma.notificationPreference.findUnique).toHaveBeenCalledTimes(2);
  });

  it('preserves direct-chat truncation, grouping, and navigation data', async () => {
    prisma.pushSubscription.findMany.mockResolvedValue([
      {
        id: 'subscription-1',
        endpoint: 'https://push.example/subscription-1',
        keys: { p256dh: 'public-key', auth: 'auth-secret' },
      },
    ]);
    webpush.sendNotification.mockResolvedValue();

    await pushNotificationService.sendChatMessageNotification(
      {
        id: 'message-1',
        type: 'TEXT',
        body: 'x'.repeat(120),
        author: { firstName: 'Ana', lastName: 'Pop' },
      },
      { id: 'channel-1', type: 'DIRECT', name: null },
      ['user-1']
    );

    const payload = JSON.parse(webpush.sendNotification.mock.calls[0][1]);
    expect(payload).toEqual({
      title: 'Ana Pop',
      body: `${'x'.repeat(97)}...`,
      icon: '/icons/message.png',
      badge: '/icons/badge.png',
      tag: 'chat-channel-1',
      data: {
        type: 'chat',
        channelId: 'channel-1',
        messageId: 'message-1',
        url: '/chat?channel=channel-1',
      },
    });
  });

  it('logs per-recipient chat errors and continues without rejecting', async () => {
    prisma.notificationPreference.findUnique.mockRejectedValue(new Error('database unavailable'));

    await expect(
      pushNotificationService.sendChatMessageNotification(
        {
          id: 'message-1',
          type: 'FILE',
          author: { firstName: 'Ana', lastName: 'Pop' },
        },
        { id: 'channel-1', type: 'TEAM', name: 'General' },
        ['user-1']
      )
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith('Failed to send chat notification', {
      userId: 'user-1',
      error: 'database unavailable',
    });
  });
});
