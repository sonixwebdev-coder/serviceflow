const { mapUser } = require('../../utils/transform');

const MESSAGE_INCLUDE = {
  author: {
    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  },
  clientAuthor: true,
  readReceipts: {
    include: {
      user: true,
      client: true,
    },
  },
  attachments: true,
};

const mapClientAuthor = (client) => {
  if (!client) return null;

  const displayName =
    client.companyName || [client.firstName, client.lastName].filter(Boolean).join(' ') || 'Client';
  return {
    id: client.id,
    _id: client.id,
    firstName: client.firstName || displayName,
    lastName: client.lastName || '',
    email: client.email,
    avatarUrl: null,
    type: 'client',
  };
};

const mapAttachments = (attachments) =>
  attachments?.map((attachment) => ({
    id: attachment.id,
    fileName: attachment.fileName,
    fileUrl: attachment.fileUrl,
    fileType: attachment.fileType,
    fileSize: attachment.fileSize,
  })) || [];

const mapReadReceipts = (receipts) =>
  receipts.map((receipt) => ({
    id: receipt.id,
    userId: receipt.userId,
    clientId: receipt.clientId,
    readAt: receipt.readAt,
  }));

const baseMessagePayload = (message, defaultType) => ({
  id: message.id,
  _id: message.id,
  appointmentId: message.appointmentId,
  authorId: message.authorId,
  clientAuthorId: message.clientAuthorId,
  body: message.body,
  type: message.type?.toLowerCase() || defaultType,
  metadata: message.metadata,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
});

const mapListedMessage = (message, currentUserId) => ({
  ...baseMessagePayload(message, 'text'),
  author: message.clientAuthorId
    ? mapClientAuthor(message.clientAuthor)
    : { ...mapUser(message.author), type: 'user' },
  attachments: mapAttachments(message.attachments),
  readReceipts: mapReadReceipts(message.readReceipts),
  isRead: message.readReceipts.some((receipt) => receipt.userId === currentUserId),
});

const mapCreatedTextMessage = (message) => ({
  ...baseMessagePayload(message, 'text'),
  author: { ...mapUser(message.author), type: 'user' },
  clientAuthorId: null,
  attachments: [],
  readReceipts: [],
  isRead: false,
});

const mapCreatedFileMessage = (message) => ({
  ...baseMessagePayload(message, 'file'),
  author: message.clientAuthorId
    ? mapClientAuthor(message.clientAuthor)
    : { ...mapUser(message.author), type: 'user' },
  clientAuthorId: null,
  attachments: mapAttachments(message.attachments),
  readReceipts: [],
  isRead: false,
});

module.exports = {
  MESSAGE_INCLUDE,
  mapClientAuthor,
  mapCreatedFileMessage,
  mapCreatedTextMessage,
  mapListedMessage,
};
