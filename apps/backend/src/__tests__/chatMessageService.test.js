const storage = require('../utils/storage');
const chatMessageService = require('../services/chatMessageService');
const { AppError } = require('../utils/errors');

jest.mock('../utils/storage', () => ({
  writeFile: jest.fn(),
  removeFile: jest.fn(),
}));

jest.mock('../services/chatService', () => ({
  ensureChannelAccess: jest.fn(),
}));

describe('chatMessageService attachment facade', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores a regular attachment under the established organization/channel path', async () => {
    const file = {
      originalname: 'photo.jpg',
      mimetype: 'image/jpeg',
      size: 123,
      buffer: Buffer.from('image'),
    };

    const attachment = await chatMessageService.saveAttachment(file, 'org1', 'channel1');

    expect(attachment).toMatchObject({
      fileName: 'photo.jpg',
      fileType: 'image/jpeg',
      fileSize: 123,
    });
    expect(attachment.fileUrl).toMatch(/^chat\/org1\/channel1\/files\/[a-f0-9]{32}\.jpg$/);
    expect(storage.writeFile).toHaveBeenCalledWith(attachment.fileUrl, file.buffer);
  });

  it('uses the webm fallback and voice path for extensionless recordings', async () => {
    const file = {
      originalname: 'recording',
      mimetype: 'audio/webm',
      size: 456,
      buffer: Buffer.from('voice'),
    };

    const attachment = await chatMessageService.saveVoiceMessage(file, 'org1', 'channel1');

    expect(attachment.fileName).toMatch(/^voice-[a-f0-9]{32}\.webm$/);
    expect(attachment.fileUrl).toBe(`chat/org1/channel1/voice/${attachment.fileName}`);
    expect(storage.writeFile).toHaveBeenCalledWith(attachment.fileUrl, file.buffer);
  });

  it('creates attachment records only for the message author', async () => {
    const prisma = {
      chatMessage: { findUnique: jest.fn().mockResolvedValue({ authorId: 'user1' }) },
      chatAttachment: { create: jest.fn().mockResolvedValue({ id: 'attachment1' }) },
    };
    const data = {
      fileName: 'report.pdf',
      fileUrl: 'chat/org1/channel1/files/report.pdf',
      fileType: 'application/pdf',
      fileSize: 1000,
    };

    await expect(
      chatMessageService.createAttachment(prisma, 'message1', data, { id: 'user1' })
    ).resolves.toEqual({ id: 'attachment1' });
    expect(prisma.chatAttachment.create).toHaveBeenCalledWith({
      data: { messageId: 'message1', ...data },
    });

    await expect(
      chatMessageService.createAttachment(prisma, 'message1', data, { id: 'user2' })
    ).rejects.toMatchObject({
      name: 'AppError',
      status: 403,
    });
  });

  it('removes the stored file before deleting an attachment record', async () => {
    const attachment = {
      id: 'attachment1',
      fileUrl: 'chat/org1/channel1/files/report.pdf',
      message: { authorId: 'user1' },
    };
    const prisma = {
      chatAttachment: {
        findUnique: jest.fn().mockResolvedValue(attachment),
        delete: jest.fn().mockResolvedValue(attachment),
      },
    };

    await chatMessageService.deleteAttachment(prisma, attachment.id, { id: 'user1' });

    expect(storage.removeFile).toHaveBeenCalledWith(attachment.fileUrl);
    expect(prisma.chatAttachment.delete).toHaveBeenCalledWith({ where: { id: attachment.id } });
    expect(storage.removeFile.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.chatAttachment.delete.mock.invocationCallOrder[0]
    );
  });

  it('retains not-found errors through the exported facade', async () => {
    const prisma = {
      chatMessage: { findUnique: jest.fn().mockResolvedValue(null) },
      chatAttachment: { create: jest.fn() },
    };

    await expect(
      chatMessageService.createAttachment(prisma, 'missing', {}, { id: 'user1' })
    ).rejects.toEqual(new AppError('Message not found', 404));
    expect(prisma.chatAttachment.create).not.toHaveBeenCalled();
  });
});
