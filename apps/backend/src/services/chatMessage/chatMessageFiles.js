const crypto = require('crypto');
const path = require('path');
const { AppError } = require('../../utils/errors');
const { writeFile, removeFile } = require('../../utils/storage');

const saveAttachment = async (file, organizationId, channelId) => {
  const fileHash = crypto.randomBytes(16).toString('hex');
  const extension = path.extname(file.originalname);
  const fileName = `${fileHash}${extension}`;
  const relativePath = `chat/${organizationId}/${channelId}/files/${fileName}`;

  await writeFile(relativePath, file.buffer);
  return {
    fileName: file.originalname,
    fileUrl: relativePath,
    fileType: file.mimetype,
    fileSize: file.size,
  };
};

const saveVoiceMessage = async (file, organizationId, channelId) => {
  const fileHash = crypto.randomBytes(16).toString('hex');
  const extension = path.extname(file.originalname) || '.webm';
  const fileName = `voice-${fileHash}${extension}`;
  const relativePath = `chat/${organizationId}/${channelId}/voice/${fileName}`;

  await writeFile(relativePath, file.buffer);
  return {
    fileName,
    fileUrl: relativePath,
    fileType: file.mimetype,
    fileSize: file.size,
  };
};

const createAttachment = async (prisma, messageId, attachmentData, currentUser) => {
  const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
  if (!message) throw new AppError('Message not found', 404);
  if (message.authorId !== currentUser.id) {
    throw new AppError('You can only add attachments to your own messages', 403);
  }

  return prisma.chatAttachment.create({
    data: {
      messageId,
      ...attachmentData,
    },
  });
};

const deleteAttachment = async (prisma, attachmentId, currentUser) => {
  const attachment = await prisma.chatAttachment.findUnique({
    where: { id: attachmentId },
    include: { message: true },
  });
  if (!attachment) throw new AppError('Attachment not found', 404);
  if (attachment.message.authorId !== currentUser.id) {
    throw new AppError('You can only delete your own attachments', 403);
  }

  await removeFile(attachment.fileUrl);
  await prisma.chatAttachment.delete({ where: { id: attachmentId } });
};

module.exports = {
  createAttachment,
  deleteAttachment,
  saveAttachment,
  saveVoiceMessage,
};
