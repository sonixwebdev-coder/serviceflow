const logger = require('../utils/logger');

let ioInstance = null;

const setIO = (io) => {
  ioInstance = io;
};

const getIO = () => ioInstance;

// ==========================================
// CRM Namespace Emitters (default /)
// ==========================================

const emit = (event, payload, rooms = []) => {
  if (!ioInstance) return;

  const targetRooms = Array.isArray(rooms) ? rooms : [rooms];

  if (!targetRooms.length) {
    ioInstance.emit(event, payload);
    return;
  }

  targetRooms.forEach((room) => {
    if (room) {
      ioInstance.to(room).emit(event, payload);
    }
  });
};

const emitToUser = (userId, event, payload) => {
  if (!ioInstance || !userId) return;
  ioInstance.to(`user:${userId}`).emit(event, payload);
};

const emitToOrganization = (organizationId, event, payload) => {
  if (!ioInstance || !organizationId) {
    logger.debug(`[Socket] emitToOrganization skipped`, { hasIO: !!ioInstance, organizationId });
    return;
  }
  logger.debug(`[Socket] Emitting ${event} to org:${organizationId}`);
  ioInstance.to(`org:${organizationId}`).emit(event, payload);
};

/**
 * Emit to a specific client (client portal)
 * Uses the default namespace where clients are connected
 */
const emitToClient = (clientId, event, payload) => {
  if (!ioInstance || !clientId) {
    logger.debug(`[Socket] emitToClient skipped`, { hasIO: !!ioInstance, clientId });
    return;
  }
  logger.debug(`[Socket] Emitting ${event} to client:${clientId}`);
  ioInstance.to(`client:${clientId}`).emit(event, payload);
};

module.exports = {
  setIO,
  getIO,
  emit,
  emitToUser,
  emitToOrganization,
  emitToClient,
};
