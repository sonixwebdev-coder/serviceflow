let ioInstance = null;
let portalIoInstance = null;

const setIO = (io) => {
  ioInstance = io;
};

const setPortalIO = (portalIo) => {
  portalIoInstance = portalIo;
};

const getIO = () => ioInstance;
const getPortalIO = () => portalIoInstance;

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
  if (!ioInstance || !organizationId) return;
  ioInstance.to(`org:${organizationId}`).emit(event, payload);
};

// ==========================================
// Portal Namespace Emitters (/portal)
// ==========================================

/**
 * Emit event to a specific client (client portal)
 */
const emitToClient = (clientId, event, payload) => {
  if (!portalIoInstance || !clientId) return;
  portalIoInstance.to(`client:${clientId}`).emit(event, payload);
};

/**
 * Emit event to all clients in an organization (client portal)
 */
const emitToOrganizationClients = (organizationId, event, payload) => {
  if (!portalIoInstance || !organizationId) return;
  portalIoInstance.to(`org:${organizationId}:clients`).emit(event, payload);
};

module.exports = {
  setIO,
  setPortalIO,
  getIO,
  getPortalIO,
  emit,
  emitToUser,
  emitToOrganization,
  emitToClient,
  emitToOrganizationClients,
};
