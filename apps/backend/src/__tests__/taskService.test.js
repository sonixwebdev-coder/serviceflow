const taskService = require('../services/taskService');
const { createNotification } = require('../services/notificationService');
const { sendTaskNotification } = require('../services/pushNotificationService');
const { getCompanySettings } = require('../services/companySettingService');
const { broadcastTask } = require('../realtime/events');

jest.mock('../utils/transform', () => ({
  mapTask: jest.fn((task) => (task ? { ...task, _id: task.id } : null)),
}));

jest.mock('../services/notificationService', () => ({
  createNotification: jest.fn(),
}));

jest.mock('../services/pushNotificationService', () => ({
  sendTaskNotification: jest.fn(),
}));

jest.mock('../services/email/emailService', () => ({
  sendTaskAssignedEmail: jest.fn(),
}));

jest.mock('../services/companySettingService', () => ({
  getCompanySettings: jest.fn(),
}));

jest.mock('../realtime/events', () => ({
  broadcastTask: jest.fn(),
}));

jest.mock('../utils/optimizedIncludes', () => ({
  optimizedTaskIncludes: { assignments: true, products: true },
  minimalTaskIncludes: { assignments: true },
}));

jest.mock('../utils/logger', () => ({
  error: jest.fn(),
}));

describe('taskService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createNotification.mockResolvedValue({});
    sendTaskNotification.mockResolvedValue(undefined);
    getCompanySettings.mockResolvedValue({ companyName: 'Example Company' });
  });

  it('lists only visible tasks while preserving normalized filters and location scope', async () => {
    const prisma = {
      task: {
        findMany: jest.fn().mockResolvedValue([{ id: 'task-1', title: 'Visible task' }]),
      },
    };

    const result = await taskService.listTasks(
      prisma,
      { status: 'in-progress', priority: 'high', assignedTo: 'assignee-1' },
      { id: 'current-user' },
      { locationFilter: { locationId: 'location-1' } }
    );

    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: {
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        assignments: { some: { userId: 'assignee-1' } },
        AND: [
          { locationId: 'location-1' },
          {
            OR: [
              { assignments: { some: { userId: 'current-user' } } },
              { createdById: 'current-user' },
            ],
          },
        ],
      },
      include: {
        assignments: true,
        products: true,
        _count: { select: { comments: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
      take: 100,
    });
    expect(result).toEqual([{ id: 'task-1', _id: 'task-1', title: 'Visible task' }]);
  });

  it('rejects access when the user neither created nor was assigned to the task', async () => {
    const prisma = {
      task: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'task-1',
          createdById: 'creator-1',
          assignments: [{ userId: 'assignee-1' }],
        }),
      },
    };

    await expect(
      taskService.getTaskById(prisma, 'task-1', { id: 'unrelated-user' })
    ).rejects.toMatchObject({
      status: 403,
      message: 'You do not have access to this task',
    });
  });

  it('creates the task graph and notifies every initial assignee', async () => {
    const createdTask = {
      id: 'task-1',
      title: 'Install equipment',
      assignments: [{ userId: 'user-1' }, { userId: 'user-2' }],
    };
    const prisma = {
      task: { create: jest.fn().mockResolvedValue(createdTask) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const currentUser = {
      id: 'creator-1',
      firstName: 'Ana',
      lastName: 'Pop',
      organizationId: 'organization-1',
    };

    const result = await taskService.createTask(
      prisma,
      {
        title: 'Install equipment',
        taskType: 'service-call',
        priority: 'high',
        dueDate: '2026-08-01T10:00:00.000Z',
        assignedTo: ['user-1', 'user-2'],
        products: [{ productName: 'Router', sku: 'RTR-1' }],
      },
      currentUser,
      { locationId: 'location-1' }
    );

    expect(prisma.task.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Install equipment',
        taskType: 'SERVICE_CALL',
        priority: 'HIGH',
        status: 'TODO',
        dueDate: new Date('2026-08-01T10:00:00.000Z'),
        createdById: 'creator-1',
        updatedById: 'creator-1',
        locationId: 'location-1',
        products: {
          create: [{ productName: 'Router', sku: 'RTR-1', quantity: 1 }],
        },
        assignments: {
          create: [{ userId: 'user-1' }, { userId: 'user-2' }],
        },
      }),
      include: { assignments: true, products: true },
    });
    expect(createNotification).toHaveBeenCalledTimes(2);
    expect(createNotification).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        recipientId: 'user-1',
        message: 'Ai fost asignat la: Install equipment',
        entityType: 'task',
        entityId: 'task-1',
      })
    );
    expect(sendTaskNotification).toHaveBeenCalledWith(createdTask, 'created');
    expect(broadcastTask).toHaveBeenCalledWith(
      'created',
      expect.objectContaining({ id: 'task-1', _id: 'task-1' })
    );
    expect(result).toMatchObject({ id: 'task-1', _id: 'task-1' });
  });

  it('limits an assignee update to status and completion and notifies the creator', async () => {
    const existingTask = {
      id: 'task-1',
      title: 'Install equipment',
      status: 'TODO',
      createdById: 'creator-1',
      assignments: [{ userId: 'assignee-1' }],
    };
    const updatedTask = { ...existingTask, status: 'IN_PROGRESS', completionPercentage: 40 };
    const prisma = {
      task: {
        findUnique: jest.fn().mockResolvedValue(existingTask),
        update: jest.fn().mockResolvedValue(updatedTask),
      },
    };

    const result = await taskService.updateTask(
      prisma,
      'task-1',
      {
        title: 'Attempted rename',
        status: 'in-progress',
        completionPercentage: 40,
        assignedTo: ['other-user'],
      },
      { id: 'assignee-1', name: 'Assigned User', roles: [] }
    );

    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: {
        status: 'IN_PROGRESS',
        completionPercentage: 40,
        updatedById: 'assignee-1',
      },
      include: { assignments: true, products: true },
    });
    expect(createNotification).toHaveBeenCalledTimes(1);
    expect(createNotification).toHaveBeenCalledWith(prisma, {
      recipientId: 'creator-1',
      title: 'Status task actualizat',
      message: 'Assigned User a schimbat status-ul task-ului "Install equipment" in In lucru',
      type: 'TASK',
      entityType: 'task',
      entityId: 'task-1',
    });
    expect(sendTaskNotification).toHaveBeenCalledWith(updatedTask, 'updated');
    expect(broadcastTask).toHaveBeenCalledWith(
      'updated',
      expect.objectContaining({ id: 'task-1' })
    );
    expect(result).toMatchObject({ status: 'IN_PROGRESS', completionPercentage: 40 });
  });
});
