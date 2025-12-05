const { emit, emitToUser } = require('./emitter');

const broadcastTask = (action, task) => {
  if (!task) return;
  const event = `task:${action}`;
  const rooms = ['tasks'];

  task.assignedTo?.forEach?.((assignee) => {
    const id = assignee?._id || assignee?.id || assignee;
    if (id) {
      rooms.push(`user:${id}`);
    }
  });

  if (task.createdBy?._id || task.createdBy?.id) {
    rooms.push(`user:${task.createdBy._id || task.createdBy.id}`);
  }

  emit(event, task, rooms);
};

const broadcastTimeEntry = (action, entry) => {
  if (!entry) return;
  const event = `time-entry:${action}`;
  emit(event, entry, ['time-entries', `user:${entry.employee?._id || entry.employeeId}`]);
};

const broadcastTimeOff = (action, request) => {
  if (!request) return;
  const event = `timeoff:${action}`;
  const rooms = ['timeoff', `user:${request.employee?._id || request.employeeId}`];
  emit(event, request, rooms);
};

const broadcastNotification = (notification) => {
  if (!notification) return;
  emitToUser(notification.recipient?._id || notification.recipientId, 'notification:new', notification);
};

const broadcastAppointment = (action, appointment) => {
  if (!appointment) return;
  const event = `appointment:${action}`;
  const rooms = ['appointments', 'role:admin', 'role:ADMIN', 'role:Admin'];
  appointment.assignees?.forEach?.((assignee) => {
    const id = assignee?.user?._id || assignee?.userId || assignee?.user?.id;
    if (id) rooms.push(`user:${id}`);
  });
  if (appointment.client?.id || appointment.clientId) {
    rooms.push(`client:${appointment.client?.id || appointment.clientId}`);
  }
  emit(event, appointment, rooms);
};

const broadcastMessage = (appointmentId, message) => {
  if (!message) return;
  const rooms = [`appointment:${appointmentId}`];
  const authorId = message.author?._id || message.authorId;
  if (authorId) {
    rooms.push(`user:${authorId}`);
  }
  emit('message:new', message, rooms);
};

const broadcastTyping = (appointmentId, user, isTyping) => {
  if (!user || !appointmentId) return;

  const userId = user._id || user.id;
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';

  emit('message:typing', {
    appointmentId,
    user: {
      id: userId,
      firstName,
      lastName,
    },
    isTyping
  }, [`appointment:${appointmentId}`]);
};

const broadcastServiceOrder = (action, serviceOrder) => {
  if (!serviceOrder) return;
  const event = `service-order:${action}`;
  const rooms = ['service-orders', 'role:admin', 'role:ADMIN', 'role:Admin'];
  if (serviceOrder.appointmentId) {
    rooms.push(`appointment:${serviceOrder.appointmentId}`);
  }
  serviceOrder.assigneeIds?.forEach?.((id) => {
    if (id) rooms.push(`user:${id}`);
  });
  emit(event, serviceOrder, rooms);
};

const broadcastInvoice = (action, invoice) => {
  if (!invoice) return;
  const event = `invoice:${action}`;
  const rooms = ['invoices', 'role:admin', 'role:ADMIN', 'role:Admin'];
  if (invoice.appointmentId) {
    rooms.push(`appointment:${invoice.appointmentId}`);
  }
  if (invoice.clientId || invoice.client?.id) {
    rooms.push(`client:${invoice.clientId || invoice.client.id}`);
  }
  emit(event, invoice, rooms);
};

module.exports = {
  broadcastTask,
  broadcastTimeEntry,
  broadcastTimeOff,
  broadcastNotification,
  broadcastAppointment,
  broadcastMessage,
  broadcastTyping,
  broadcastServiceOrder,
  broadcastInvoice,
};
