const { emit, emitToUser, emitToOrganization, emitToClient } = require('./emitter');

const broadcastAuditLog = (organizationId, auditLog) => {
  if (!auditLog || !organizationId) return;
  emitToOrganization(organizationId, 'audit:created', auditLog);
};

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

/**
 * Broadcast appointment updates to the client (client portal)
 */
const broadcastAppointmentToClient = (action, appointment) => {
  if (!appointment || !appointment.clientId) return;
  const event = `portal:appointment:${action}`;
  // Send sanitized data to client portal (exclude internal fields)
  const clientData = {
    id: appointment.id,
    title: appointment.title,
    description: appointment.description,
    status: appointment.status,
    scheduledStart: appointment.scheduledStart,
    scheduledEnd: appointment.scheduledEnd,
    location: appointment.location,
    cancellationReason: appointment.cancellationReason,
    vehicle: appointment.vehicle ? {
      id: appointment.vehicle.id,
      make: appointment.vehicle.make,
      model: appointment.vehicle.model,
      plateNumber: appointment.vehicle.plateNumber,
      year: appointment.vehicle.year,
    } : null,
    asset: appointment.asset ? {
      id: appointment.asset.id,
      name: appointment.asset.name,
      identifier: appointment.asset.identifier,
      type: appointment.asset.type,
    } : null,
  };
  emitToClient(appointment.clientId, event, clientData);
};

/**
 * Broadcast invoice updates to the client (client portal)
 */
const broadcastInvoiceToClient = (action, invoice) => {
  if (!invoice || !invoice.clientId) return;
  const event = `portal:invoice:${action}`;
  // Send sanitized data to client portal
  const clientData = {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    totalAmount: invoice.totalAmount,
    currency: invoice.currency,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    paidAt: invoice.paidAt,
  };
  emitToClient(invoice.clientId, event, clientData);
};

/**
 * Broadcast client profile updates to the client (client portal)
 */
const broadcastClientUpdate = (action, client) => {
  if (!client || !client.id) return;
  const event = `portal:client:${action}`;
  const clientData = {
    id: client.id,
    firstName: client.firstName,
    lastName: client.lastName,
    companyName: client.companyName,
    email: client.email,
    phone: client.phone,
    type: client.type,
  };
  emitToClient(client.id, event, clientData);
};

/**
 * Broadcast asset updates to CRM (from portal) and to client portal (from CRM)
 */
const broadcastAssetUpdate = (action, asset, organizationId, source = 'crm') => {
  if (!asset || !asset.id) return;

  const assetData = {
    id: asset.id,
    name: asset.name,
    type: asset.type,
    manufacturer: asset.manufacturer,
    model: asset.model,
    identifier: asset.identifier,
    year: asset.year,
    clientId: asset.clientId,
    source, // 'crm' or 'portal'
  };

  // If from CRM, broadcast to client portal
  if (source === 'crm' && asset.clientId) {
    emitToClient(asset.clientId, `portal:asset:${action}`, assetData);
  }

  // Broadcast to CRM organization
  if (organizationId) {
    emitToOrganization(organizationId, `asset:${action}`, assetData);
  }
};

module.exports = {
  broadcastAuditLog,
  broadcastTask,
  broadcastTimeEntry,
  broadcastTimeOff,
  broadcastNotification,
  broadcastAppointment,
  broadcastMessage,
  broadcastTyping,
  broadcastServiceOrder,
  broadcastInvoice,
  // Client portal broadcasts
  broadcastAppointmentToClient,
  broadcastInvoiceToClient,
  broadcastClientUpdate,
  broadcastAssetUpdate,
};
