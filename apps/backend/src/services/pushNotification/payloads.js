const BADGE_ICON = '/icons/badge.png';

const getMessageTypeLabel = (type) => {
  switch (type) {
    case 'IMAGE':
      return 'A trimis o imagine';
    case 'FILE':
      return 'A trimis un fișier';
    case 'VOICE':
      return 'A trimis un mesaj vocal';
    default:
      return 'A trimis un mesaj';
  }
};

const buildAppointmentNotification = (appointment, type) => {
  let title;
  let body;
  let icon = '/icons/appointment.png';

  switch (type) {
    case 'created':
      title = 'Programare noua';
      body = `Ai fost alocat la: ${appointment.title}`;
      break;
    case 'updated':
      title = 'Programare actualizata';
      body = `Programarea "${appointment.title}" a fost modificata`;
      break;
    case 'cancelled':
      title = 'Programare anulata';
      body = `Programarea "${appointment.title}" a fost anulata`;
      break;
    case 'message':
      title = 'Mesaj nou';
      body = `Mesaj nou la programarea "${appointment.title}"`;
      icon = '/icons/message.png';
      break;
    default:
      return null;
  }

  const recipientIds =
    appointment.assignees
      ?.map((assignee) => assignee.userId || assignee.user?.id)
      .filter(Boolean) || [];

  return {
    recipientIds,
    payload: {
      title,
      body,
      icon,
      badge: BADGE_ICON,
      data: {
        type: 'appointment',
        appointmentId: appointment.id,
        url: `/appointments?id=${appointment.id}`,
      },
    },
  };
};

const buildLeaveRequestPayload = (request, type) => {
  let title;
  let body;

  switch (type) {
    case 'created':
      title = 'Cerere de concediu noua';
      body = `${request.employee?.firstName} ${request.employee?.lastName} a solicitat concediu`;
      break;
    case 'approved':
      title = 'Cerere aprobata';
      body = 'Cererea ta de concediu a fost aprobata';
      break;
    case 'rejected':
      title = 'Cerere respinsa';
      body = 'Cererea ta de concediu a fost respinsa';
      break;
    default:
      return null;
  }

  return {
    title,
    body,
    icon: '/icons/leave.png',
    badge: BADGE_ICON,
    data: {
      type: 'leave',
      leaveRequestId: request.id,
      url: '/leave-requests',
    },
  };
};

const buildTaskNotification = (task, type) => {
  let title;
  let body;

  switch (type) {
    case 'assigned':
      title = 'Task nou alocat';
      body = `Ai fost alocat la: ${task.title}`;
      break;
    case 'updated':
      title = 'Task actualizat';
      body = `Task-ul "${task.title}" a fost modificat`;
      break;
    case 'comment':
      title = 'Comentariu nou';
      body = `Comentariu nou la task-ul "${task.title}"`;
      break;
    default:
      return null;
  }

  const recipientIds = task.assignees?.map((assignee) => assignee.userId).filter(Boolean) || [];

  return {
    recipientIds,
    payload: {
      title,
      body,
      icon: '/icons/task.png',
      badge: BADGE_ICON,
      data: {
        type: 'task',
        taskId: task.id,
        url: `/tasks?id=${task.id}`,
      },
    },
  };
};

const buildReminderPayload = (todo) => ({
  title: 'Reminder',
  body: todo.title,
  icon: '/icons/reminder.png',
  badge: BADGE_ICON,
  data: {
    type: 'reminder',
    todoId: todo.id,
    url: '/dashboard',
  },
});

const buildChatMessagePayload = (message, channel) => {
  const authorName =
    `${message.author?.firstName || ''} ${message.author?.lastName || ''}`.trim() || 'Cineva';
  const channelName = channel.name || (channel.type === 'DIRECT' ? 'Mesaj direct' : 'Chat');

  let title;
  let body;
  if (channel.type === 'DIRECT') {
    title = authorName;
    body = message.type === 'TEXT' ? message.body : getMessageTypeLabel(message.type);
  } else {
    title = `${channelName}`;
    body = `${authorName}: ${
      message.type === 'TEXT' ? message.body : getMessageTypeLabel(message.type)
    }`;
  }

  if (body.length > 100) {
    body = body.substring(0, 97) + '...';
  }

  return {
    title,
    body,
    icon: '/icons/message.png',
    badge: BADGE_ICON,
    tag: `chat-${channel.id}`,
    data: {
      type: 'chat',
      channelId: channel.id,
      messageId: message.id,
      url: `/chat?channel=${channel.id}`,
    },
  };
};

const buildAppointmentMessagePayload = ({
  appointmentId,
  appointmentTitle,
  author,
  messageBody,
  messageType,
  isFromClient,
}) => {
  const authorName = isFromClient
    ? author?.companyName ||
      `${author?.firstName || ''} ${author?.lastName || ''}`.trim() ||
      'Client'
    : `${author?.firstName || ''} ${author?.lastName || ''}`.trim() || 'Utilizator';
  const title = isFromClient ? 'Mesaj de la client' : 'Mesaj nou';

  let body;
  if (messageType === 'TEXT') {
    body = `${authorName} in "${appointmentTitle}": ${messageBody}`;
  } else if (messageType === 'FILE') {
    const isVoice =
      messageBody?.toLowerCase().includes('voice') || messageBody?.toLowerCase().includes('audio');
    body = isVoice
      ? `${authorName} a trimis un mesaj vocal in "${appointmentTitle}"`
      : `${authorName} a trimis un fisier in "${appointmentTitle}"`;
  } else {
    body = `${authorName} a trimis un mesaj in "${appointmentTitle}"`;
  }

  if (body.length > 120) {
    body = body.substring(0, 117) + '...';
  }

  return {
    title,
    body,
    icon: '/icons/message.png',
    badge: BADGE_ICON,
    tag: `appointment-message-${appointmentId}`,
    data: {
      type: 'appointment-message',
      appointmentId,
      url: `/appointments?id=${appointmentId}&tab=messages`,
    },
  };
};

module.exports = {
  buildAppointmentMessagePayload,
  buildAppointmentNotification,
  buildChatMessagePayload,
  buildLeaveRequestPayload,
  buildReminderPayload,
  buildTaskNotification,
  getMessageTypeLabel,
};
