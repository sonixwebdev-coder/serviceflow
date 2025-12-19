const { emit, emitToUser, emitToOrganization } = require('./emitter');

const broadcastTask = (action, task) => {
  if (!task || !task.organizationId) return;
  const event = `task:${action}`;
  emitToOrganization(task.organizationId, event, task);
};

const broadcastTimeEntry = (action, entry) => {
  if (!entry || !entry.organizationId) return;
  const event = `time-entry:${action}`;
  emitToOrganization(entry.organizationId, event, entry);
};

const broadcastTimeOff = (action, request) => {
  if (!request || !request.organizationId) return;
  const event = `timeoff:${action}`;
  emitToOrganization(request.organizationId, event, request);
};

const broadcastNotification = (notification) => {
  if (!notification) return;
  emitToUser(notification.recipient?._id || notification.recipientId, 'notification:new', notification);
};

const broadcastAppointment = (action, appointment) => {
  if (!appointment || !appointment.organizationId) return;
  const event = `appointment:${action}`;
  emitToOrganization(appointment.organizationId, event, appointment);
};

const broadcastMessage = (organizationId, appointmentId, message) => {
  if (!message || !organizationId) return;
  emitToOrganization(organizationId, 'message:new', message);
};

const broadcastTyping = (organizationId, appointmentId, user, isTyping) => {
  if (!user || !appointmentId || !organizationId) return;

  const userId = user._id || user.id;
  const firstName = user.firstName || '';
  const lastName = user.lastName || '';

  emitToOrganization(organizationId, 'message:typing', {
    appointmentId,
    user: {
      id: userId,
      firstName,
      lastName,
    },
    isTyping
  });
};

const broadcastServiceOrder = (action, serviceOrder) => {
  if (!serviceOrder || !serviceOrder.organizationId) return;
  const event = `service-order:${action}`;
  emitToOrganization(serviceOrder.organizationId, event, serviceOrder);
};

const broadcastInvoice = (action, invoice) => {
  if (!invoice || !invoice.organizationId) return;
  const event = `invoice:${action}`;
  emitToOrganization(invoice.organizationId, event, invoice);
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
