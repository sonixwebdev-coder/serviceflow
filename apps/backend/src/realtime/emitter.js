let ioInstance = null;

const setIO = (io) => {
  ioInstance = io;
};

const getIO = () => ioInstance;

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

module.exports = {
  setIO,
  getIO,
  emit,
  emitToUser,
};
