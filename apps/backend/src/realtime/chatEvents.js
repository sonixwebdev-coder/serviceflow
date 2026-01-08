const { emitToOrganization } = require('./emitter');

/**
 * Chat Real-time Event Broadcasting
 * Broadcasts chat events to organization members via Socket.io
 */

/**
 * Broadcast new chat message to channel members
 * @param {string} organizationId - Organization ID
 * @param {string} channelId - Channel ID
 * @param {Object} message - Message object
 */
function broadcastChatMessage(organizationId, channelId, message) {
  if (!organizationId || !channelId) return;

  emitToOrganization(organizationId, 'chat:message:new', {
    channelId,
    message,
  });
}

/**
 * Broadcast message update
 * @param {string} organizationId - Organization ID
 * @param {string} channelId - Channel ID
 * @param {Object} message - Updated message object
 */
function broadcastChatMessageUpdate(organizationId, channelId, message) {
  if (!organizationId || !channelId) return;

  emitToOrganization(organizationId, 'chat:message:updated', {
    channelId,
    message,
  });
}

/**
 * Broadcast message deletion
 * @param {string} organizationId - Organization ID
 * @param {string} channelId - Channel ID
 * @param {string} messageId - Deleted message ID
 */
function broadcastChatMessageDelete(organizationId, channelId, messageId) {
  if (!organizationId || !channelId) return;

  emitToOrganization(organizationId, 'chat:message:deleted', {
    channelId,
    messageId,
  });
}

/**
 * Broadcast typing indicator
 * @param {string} organizationId - Organization ID
 * @param {string} channelId - Channel ID
 * @param {Object} user - User object (id, firstName, lastName)
 * @param {boolean} isTyping - Whether user is typing
 */
function broadcastTyping(organizationId, channelId, user, isTyping) {
  if (!organizationId || !channelId) return;

  emitToOrganization(organizationId, 'chat:typing', {
    channelId,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    isTyping,
  });
}

/**
 * Broadcast channel update
 * @param {string} organizationId - Organization ID
 * @param {Object} channel - Updated channel object
 */
function broadcastChannelUpdate(organizationId, channel) {
  if (!organizationId) return;

  emitToOrganization(organizationId, 'chat:channel:updated', channel);
}

/**
 * Broadcast member join/leave
 * @param {string} organizationId - Organization ID
 * @param {string} channelId - Channel ID
 * @param {string} action - Action type ('added' or 'removed')
 * @param {Object} member - Member object
 */
function broadcastMemberChange(organizationId, channelId, action, member) {
  if (!organizationId || !channelId) return;

  emitToOrganization(organizationId, `chat:member:${action}`, {
    channelId,
    member,
  });
}

/**
 * Broadcast user presence (online/offline)
 * @param {string} organizationId - Organization ID
 * @param {string} userId - User ID
 * @param {boolean} isOnline - Whether user is online
 */
function broadcastPresence(organizationId, userId, isOnline) {
  if (!organizationId) return;

  emitToOrganization(organizationId, 'chat:presence', {
    userId,
    isOnline,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Broadcast read receipt
 * @param {string} organizationId - Organization ID
 * @param {string} channelId - Channel ID
 * @param {string} userId - User ID who read the message
 * @param {string} messageId - Message ID
 */
function broadcastReadReceipt(organizationId, channelId, userId, messageId) {
  if (!organizationId || !channelId) return;

  emitToOrganization(organizationId, 'chat:read', {
    channelId,
    userId,
    messageId,
  });
}

/**
 * Broadcast channel created
 * @param {string} organizationId - Organization ID
 * @param {Object} channel - New channel object
 */
function broadcastChannelCreated(organizationId, channel) {
  if (!organizationId) return;

  emitToOrganization(organizationId, 'chat:channel:created', channel);
}

/**
 * Broadcast channel archived
 * @param {string} organizationId - Organization ID
 * @param {string} channelId - Channel ID
 */
function broadcastChannelArchived(organizationId, channelId) {
  if (!organizationId) return;

  emitToOrganization(organizationId, 'chat:channel:archived', {
    channelId,
  });
}

module.exports = {
  broadcastChatMessage,
  broadcastChatMessageUpdate,
  broadcastChatMessageDelete,
  broadcastTyping,
  broadcastChannelUpdate,
  broadcastMemberChange,
  broadcastPresence,
  broadcastReadReceipt,
  broadcastChannelCreated,
  broadcastChannelArchived,
};
