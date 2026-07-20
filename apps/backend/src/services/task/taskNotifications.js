const { createNotification } = require('../notificationService');
const { sendTaskNotification } = require('../pushNotificationService');
const { sendTaskAssignedEmail } = require('../email/emailService');
const { getCompanySettings } = require('../companySettingService');
const logger = require('../../utils/logger');

const notifyTaskAssignees = (prisma, assignments, task, title) =>
  Promise.all(
    assignments.map((userId) =>
      createNotification(prisma, {
        recipientId: userId,
        title: 'Task nou asignat',
        message: `Ai fost asignat la: ${title}`,
        type: 'TASK',
        entityType: 'task',
        entityId: task.id,
      })
    )
  );

const notifyTaskStatusChange = (prisma, task, status, currentUser, assignedIds) => {
  const statusLabels = {
    TODO: 'De facut',
    IN_PROGRESS: 'In lucru',
    COMPLETED: 'Finalizat',
  };
  const recipients = new Set([...assignedIds, task.createdById]);
  recipients.delete(currentUser.id);

  return Promise.all(
    Array.from(recipients).map((recipientId) =>
      createNotification(prisma, {
        recipientId,
        title: 'Status task actualizat',
        message: `${currentUser.name || 'Un coleg'} a schimbat status-ul task-ului "${task.title}" in ${statusLabels[status] || status}`,
        type: 'TASK',
        entityType: 'task',
        entityId: task.id,
      })
    )
  );
};

const notifyTaskComment = (prisma, task, currentUser, assignedIds) => {
  const recipients = new Set([...assignedIds, task.createdById]);
  recipients.delete(currentUser.id);

  return Promise.all(
    Array.from(recipients).map((recipientId) =>
      createNotification(prisma, {
        recipientId,
        title: 'Comentariu nou la task',
        message: `${currentUser.name || 'Un coleg'} a comentat la ${task.title}`,
        type: 'TASK',
        entityType: 'task',
        entityId: task.id,
      })
    )
  );
};

const sendTaskPushSafely = async (task, event, operation) => {
  try {
    await sendTaskNotification(task, event);
  } catch (error) {
    logger.error(`Failed to send push notifications for task ${operation}`, {
      error: error.message,
      taskId: task?.id,
    });
  }
};

const queueTaskAssignedEmails = (prisma, assignments, task, currentUser) => {
  if (assignments.length === 0) return Promise.resolve();

  const assignerName =
    currentUser.name ||
    `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
    'Un coleg';

  return getCompanySettings(currentUser.organizationId)
    .then((companySettings) =>
      prisma.user
        .findMany({
          where: { id: { in: assignments } },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            organizationId: true,
          },
        })
        .then((users) => {
          for (const user of users) {
            if (user.email && user.id !== currentUser.id) {
              sendTaskAssignedEmail(prisma, {
                user,
                task,
                assignedBy: assignerName,
                companySettings,
                organizationId: user.organizationId,
              }).catch((error) =>
                logger.error('Task assignment email delivery failed', {
                  error: error.message,
                  recipientId: user.id,
                  taskId: task.id,
                })
              );
            }
          }
        })
    )
    .catch((error) => {
      logger.error('Failed to prepare task assignment emails', {
        error: error.message,
        taskId: task.id,
      });
    });
};

module.exports = {
  notifyTaskAssignees,
  notifyTaskComment,
  notifyTaskStatusChange,
  queueTaskAssignedEmails,
  sendTaskPushSafely,
};
