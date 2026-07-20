const {
  serializePushPayload,
  summarizeSubscriptionDeliveries,
  summarizeUserDeliveries,
  toWebPushSubscription,
} = require('../services/pushNotification/delivery');
const {
  buildAppointmentMessagePayload,
  buildAppointmentNotification,
  buildChatMessagePayload,
  buildLeaveRequestPayload,
  buildReminderPayload,
  buildTaskNotification,
  getMessageTypeLabel,
} = require('../services/pushNotification/payloads');
const {
  isNotificationTypeEnabled,
  isPushEnabled,
} = require('../services/pushNotification/preferences');

describe('push notification payload helpers', () => {
  it('builds appointment payloads and keeps both assignee identifier forms', () => {
    expect(
      buildAppointmentNotification(
        {
          id: 'appointment-1',
          title: 'Revizie',
          assignees: [
            { userId: 'user-1' },
            { userId: null, user: { id: 'user-2' } },
            { userId: null },
          ],
        },
        'message'
      )
    ).toEqual({
      recipientIds: ['user-1', 'user-2'],
      payload: {
        title: 'Mesaj nou',
        body: 'Mesaj nou la programarea "Revizie"',
        icon: '/icons/message.png',
        badge: '/icons/badge.png',
        data: {
          type: 'appointment',
          appointmentId: 'appointment-1',
          url: '/appointments?id=appointment-1',
        },
      },
    });
    expect(buildAppointmentNotification({}, 'unknown')).toBeNull();
  });

  it('builds leave, task, and reminder payload contracts', () => {
    expect(
      buildLeaveRequestPayload(
        {
          id: 'leave-1',
          employee: { firstName: 'Ana', lastName: 'Pop' },
        },
        'created'
      )
    ).toEqual({
      title: 'Cerere de concediu noua',
      body: 'Ana Pop a solicitat concediu',
      icon: '/icons/leave.png',
      badge: '/icons/badge.png',
      data: {
        type: 'leave',
        leaveRequestId: 'leave-1',
        url: '/leave-requests',
      },
    });
    expect(
      buildTaskNotification(
        {
          id: 'task-1',
          title: 'Oferta',
          assignees: [{ userId: 'user-1' }],
        },
        'updated'
      )
    ).toEqual({
      recipientIds: ['user-1'],
      payload: {
        title: 'Task actualizat',
        body: 'Task-ul "Oferta" a fost modificat',
        icon: '/icons/task.png',
        badge: '/icons/badge.png',
        data: { type: 'task', taskId: 'task-1', url: '/tasks?id=task-1' },
      },
    });
    expect(buildReminderPayload({ id: 'todo-1', title: 'Suna clientul' })).toEqual({
      title: 'Reminder',
      body: 'Suna clientul',
      icon: '/icons/reminder.png',
      badge: '/icons/badge.png',
      data: { type: 'reminder', todoId: 'todo-1', url: '/dashboard' },
    });
  });

  it.each([
    ['IMAGE', 'A trimis o imagine'],
    ['FILE', 'A trimis un fișier'],
    ['VOICE', 'A trimis un mesaj vocal'],
    ['OTHER', 'A trimis un mesaj'],
  ])('maps %s messages to the existing label', (type, label) => {
    expect(getMessageTypeLabel(type)).toBe(label);
  });

  it('builds and truncates grouped chat payloads', () => {
    const payload = buildChatMessagePayload(
      {
        id: 'message-1',
        type: 'TEXT',
        body: 'x'.repeat(120),
        author: { firstName: 'Ana', lastName: 'Pop' },
      },
      { id: 'channel-1', type: 'TEAM', name: 'General' }
    );

    expect(payload).toEqual({
      title: 'General',
      body: `${'Ana Pop: '.concat('x'.repeat(120)).substring(0, 97)}...`,
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

  it('distinguishes client voice attachments in appointment messages', () => {
    expect(
      buildAppointmentMessagePayload({
        appointmentId: 'appointment-1',
        appointmentTitle: 'Revizie',
        author: { companyName: 'Exemplu SRL' },
        messageBody: 'voice-message.webm',
        messageType: 'FILE',
        isFromClient: true,
      })
    ).toEqual({
      title: 'Mesaj de la client',
      body: 'Exemplu SRL a trimis un mesaj vocal in "Revizie"',
      icon: '/icons/message.png',
      badge: '/icons/badge.png',
      tag: 'appointment-message-appointment-1',
      data: {
        type: 'appointment-message',
        appointmentId: 'appointment-1',
        url: '/appointments?id=appointment-1&tab=messages',
      },
    });
  });
});

describe('push notification preference and delivery helpers', () => {
  it('uses the global and category preference values without changing their truthiness', () => {
    const preferences = { enablePushNotifications: 'enabled', enableTasks: 1 };

    expect(isPushEnabled(preferences)).toBe('enabled');
    expect(isNotificationTypeEnabled(preferences, 'enableTasks')).toBe(1);
    expect(
      isNotificationTypeEnabled(
        { enablePushNotifications: false, enableTasks: true },
        'enableTasks'
      )
    ).toBe(false);
  });

  it('maps and serializes web-push delivery arguments', () => {
    const subscription = {
      id: 'subscription-1',
      endpoint: 'https://push.example/subscription-1',
      keys: { p256dh: 'public-key', auth: 'auth-secret' },
      ignored: true,
    };
    const payload = { title: 'Test' };

    expect(toWebPushSubscription(subscription)).toEqual({
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    });
    expect(serializePushPayload(payload)).toBe(JSON.stringify(payload));
  });

  it('summarizes subscription and user delivery results exactly', () => {
    expect(
      summarizeSubscriptionDeliveries([
        { status: 'fulfilled', value: { success: true } },
        { status: 'fulfilled', value: { success: false } },
        { status: 'rejected', reason: new Error('delivery rejected') },
      ])
    ).toEqual({ sent: 1, failed: 2, total: 3 });

    expect(
      summarizeUserDeliveries([
        { status: 'fulfilled', value: { sent: 2, failed: 1 } },
        { status: 'fulfilled', value: { sent: 1, failed: 0 } },
        { status: 'rejected', reason: new Error('user lookup failed') },
      ])
    ).toEqual({ sent: 3, failed: 1, errors: ['user lookup failed'] });
  });
});
