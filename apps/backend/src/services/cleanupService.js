const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const prisma = require('../../lib/prisma');
const { getCutoffDate, FINANCIAL_AUDIT_ENTITY_TYPES } = require('../utils/retentionPolicy');
const { STORAGE_ROOT, removeFile } = require('../utils/storage');
const logger = require('../utils/logger');

/**
 * Delete expired sessions and tokens across all orgs (global).
 */
const BATCH_DELETE_LIMIT = 1000;

/**
 * Delete in batches to avoid long-running table locks.
 * Finds IDs first, then deletes in chunks.
 */
async function batchDelete(model, where, idField = 'id') {
  let totalDeleted = 0;
  while (true) {
    const rows = await model.findMany({ where, select: { [idField]: true }, take: BATCH_DELETE_LIMIT });
    if (rows.length === 0) break;
    const ids = rows.map((r) => r[idField]);
    const result = await model.deleteMany({ where: { [idField]: { in: ids } } });
    totalDeleted += result.count;
    if (rows.length < BATCH_DELETE_LIMIT) break;
  }
  return totalDeleted;
}

async function cleanupExpiredSessions() {
  const now = new Date();
  const stats = {};

  // Revoked tokens grace period: keep for 1 day after revocation (for audit purposes),
  // then delete regardless of expiresAt — these will never be used again.
  const revokedGraceCutoff = new Date();
  revokedGraceCutoff.setDate(revokedGraceCutoff.getDate() - 1);

  const [
    expiredRefreshTokens,
    revokedRefreshTokens,
    expiredClientSessions,
    expiredClientRefreshTokens,
    revokedClientRefreshTokens,
  ] = await Promise.all([
    batchDelete(prisma.refreshToken, { expiresAt: { lt: now } }),
    batchDelete(prisma.refreshToken, { revokedAt: { lt: revokedGraceCutoff } }),
    batchDelete(prisma.clientSession, { expiresAt: { lt: now } }),
    batchDelete(prisma.clientRefreshToken, { expiresAt: { lt: now } }),
    batchDelete(prisma.clientRefreshToken, { revokedAt: { lt: revokedGraceCutoff } }),
  ]);

  stats.refreshTokens = expiredRefreshTokens + revokedRefreshTokens;
  stats.clientSessions = expiredClientSessions;
  stats.clientRefreshTokens = expiredClientRefreshTokens + revokedClientRefreshTokens;

  // Clean up old typing indicators (older than 1 day)
  const typingCutoff = new Date();
  typingCutoff.setDate(typingCutoff.getDate() - 1);
  const typing = await batchDelete(prisma.chatTypingIndicator, { startedAt: { lt: typingCutoff } });
  stats.typingIndicators = typing;

  return stats;
}

/**
 * Clean up global system logs (no organizationId — not covered by per-org retention).
 * Keeps logs for 90 days regardless of plan.
 */
async function cleanupSystemLogs() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const deleted = await batchDelete(prisma.systemLog, { createdAt: { lt: cutoff } });
  return { systemLogs: deleted };
}

/**
 * Per-org retention cleanup based on plan tier.
 */
async function cleanupOrganization(orgId) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { plan: true },
  });
  if (!org) return null;

  const plan = org.plan;
  const stats = { notifications: 0, auditLogs: 0, emailLogs: 0, chatMessages: 0, chatAttachments: 0, messages: 0, messageAttachments: 0 };

  // 1. Notifications
  const notifCutoff = getCutoffDate('notifications', plan);
  if (notifCutoff) {
    stats.notifications = await batchDelete(prisma.notification, {
      organizationId: orgId, createdAt: { lt: notifCutoff },
    });
  }

  // 2. Audit logs (excluding financial entity types)
  const logsCutoff = getCutoffDate('logs', plan);
  if (logsCutoff) {
    stats.auditLogs = await batchDelete(prisma.auditLog, {
      organizationId: orgId,
      createdAt: { lt: logsCutoff },
      NOT: { entityType: { in: FINANCIAL_AUDIT_ENTITY_TYPES } },
    });
  }

  // 3. Email logs
  if (logsCutoff) {
    stats.emailLogs = await batchDelete(prisma.emailLog, {
      organizationId: orgId, createdAt: { lt: logsCutoff },
    });
  }

  // 4. Chat messages — soft-delete old messages, delete attachments
  const chatCutoff = getCutoffDate('chat', plan);
  if (chatCutoff) {
    // Find org channels
    const channels = await prisma.chatChannel.findMany({
      where: { organizationId: orgId },
      select: { id: true },
    });
    const channelIds = channels.map((c) => c.id);

    if (channelIds.length > 0) {
      // Find old messages that aren't already deleted
      const oldMessages = await prisma.chatMessage.findMany({
        where: {
          channelId: { in: channelIds },
          createdAt: { lt: chatCutoff },
          isDeleted: false,
        },
        select: { id: true },
      });
      const messageIds = oldMessages.map((m) => m.id);

      if (messageIds.length > 0) {
        // Get attachments to delete files
        const attachments = await prisma.chatAttachment.findMany({
          where: { messageId: { in: messageIds } },
          select: { id: true, fileUrl: true },
        });

        // Delete attachment files from disk
        for (const att of attachments) {
          if (att.fileUrl) {
            await removeFile(att.fileUrl).catch(() => {});
          }
        }

        // Delete attachment records
        const attResult = await prisma.chatAttachment.deleteMany({
          where: { messageId: { in: messageIds } },
        });
        stats.chatAttachments = attResult.count;

        // Soft-delete messages
        const msgResult = await prisma.chatMessage.updateMany({
          where: { id: { in: messageIds } },
          data: { isDeleted: true, deletedAt: new Date(), body: '[Mesaj sters - politica de retentie]' },
        });
        stats.chatMessages = msgResult.count;
      }
    }
  }

  // 5. Appointment messages + attachments (hard delete)
  const msgCutoff = getCutoffDate('messages', plan);
  if (msgCutoff) {
    // Find old messages for this org's appointments
    const oldMessages = await prisma.message.findMany({
      where: {
        appointment: { organizationId: orgId },
        createdAt: { lt: msgCutoff },
      },
      select: { id: true },
    });
    const msgIds = oldMessages.map((m) => m.id);

    if (msgIds.length > 0) {
      // Get attachments to delete files
      const attachments = await prisma.messageAttachment.findMany({
        where: { messageId: { in: msgIds } },
        select: { id: true, fileUrl: true },
      });

      for (const att of attachments) {
        if (att.fileUrl) {
          await removeFile(att.fileUrl).catch(() => {});
        }
      }

      // Delete read receipts, then attachments, then messages
      await prisma.messageReadReceipt.deleteMany({ where: { messageId: { in: msgIds } } });
      const attResult = await prisma.messageAttachment.deleteMany({ where: { messageId: { in: msgIds } } });
      stats.messageAttachments = attResult.count;

      const msgResult = await prisma.message.deleteMany({ where: { id: { in: msgIds } } });
      stats.messages = msgResult.count;
    }
  }

  return stats;
}

/**
 * Find orgs where ALL users have lastLoginAt before cutoff (or null).
 */
async function getIdleAccounts(idleDays = 180) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - idleDays);

  const orgs = await prisma.organization.findMany({
    where: {
      status: { in: ['ACTIVE', 'TRIAL'] },
      users: {
        every: {
          OR: [
            { lastLoginAt: null },
            { lastLoginAt: { lt: cutoff } },
          ],
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      plan: true,
      status: true,
      createdAt: true,
      _count: { select: { users: true } },
      users: {
        select: { lastLoginAt: true },
        orderBy: { lastLoginAt: 'desc' },
        take: 1,
      },
    },
  });

  return orgs.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    plan: org.plan,
    status: org.status,
    createdAt: org.createdAt,
    userCount: org._count.users,
    lastLogin: org.users[0]?.lastLoginAt || null,
  }));
}

/**
 * Scan storage directories for orphan files not referenced in DB.
 */
async function cleanupOrphanFiles() {
  const stats = { filesDeleted: 0, bytesFreed: 0 };

  // Build known URL sets by paginating through attachments to avoid loading all into memory
  const collectUrls = async (model) => {
    const urls = new Set();
    let cursor = undefined;
    while (true) {
      const batch = await model.findMany({
        select: { id: true, fileUrl: true },
        take: 5000,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' },
      });
      if (batch.length === 0) break;
      for (const a of batch) urls.add(a.fileUrl);
      cursor = batch[batch.length - 1].id;
      if (batch.length < 5000) break;
    }
    return urls;
  };

  // Scan chat storage
  const chatDir = path.join(STORAGE_ROOT, 'chat');
  if (fs.existsSync(chatDir)) {
    const knownUrls = await collectUrls(prisma.chatAttachment);
    await scanDirectory(chatDir, 'chat', knownUrls, stats);
  }

  // Scan uploads/messages storage
  const uploadsDir = path.join(STORAGE_ROOT, 'uploads', 'messages');
  if (fs.existsSync(uploadsDir)) {
    const knownUrls = await collectUrls(prisma.messageAttachment);
    await scanDirectory(uploadsDir, 'uploads/messages', knownUrls, stats);
  }

  return stats;
}

async function scanDirectory(dirPath, prefix, knownUrls, stats) {
  try {
    const entries = await fsp.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        await scanDirectory(fullPath, `${prefix}/${entry.name}`, knownUrls, stats);
      } else if (entry.isFile()) {
        const relativePath = `${prefix}/${entry.name}`;
        // Also check with leading slash
        if (!knownUrls.has(relativePath) && !knownUrls.has(`/${relativePath}`)) {
          try {
            const stat = await fsp.stat(fullPath);
            await fsp.unlink(fullPath);
            stats.filesDeleted++;
            stats.bytesFreed += stat.size;
          } catch {
            // Skip files that can't be deleted
          }
        }
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }
}

/**
 * Get storage stats for admin dashboard.
 */
async function getStorageStats() {
  const [
    chatMessageCount,
    chatAttachmentCount,
    messageCount,
    messageAttachmentCount,
    notificationCount,
    auditLogCount,
    emailLogCount,
    systemLogCount,
  ] = await Promise.all([
    prisma.chatMessage.count(),
    prisma.chatAttachment.count(),
    prisma.message.count(),
    prisma.messageAttachment.count(),
    prisma.notification.count(),
    prisma.auditLog.count(),
    prisma.emailLog.count(),
    prisma.systemLog.count(),
  ]);

  // Directory sizes
  const chatDirSize = await getDirectorySize(path.join(STORAGE_ROOT, 'chat'));
  const uploadsDirSize = await getDirectorySize(path.join(STORAGE_ROOT, 'uploads', 'messages'));

  return {
    records: {
      chatMessages: chatMessageCount,
      chatAttachments: chatAttachmentCount,
      messages: messageCount,
      messageAttachments: messageAttachmentCount,
      notifications: notificationCount,
      auditLogs: auditLogCount,
      emailLogs: emailLogCount,
      systemLogs: systemLogCount,
    },
    storage: {
      chatFiles: chatDirSize,
      uploadFiles: uploadsDirSize,
      total: chatDirSize + uploadsDirSize,
    },
  };
}

async function getDirectorySize(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) return 0;
    let total = 0;
    const entries = await fsp.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        total += await getDirectorySize(fullPath);
      } else {
        const stat = await fsp.stat(fullPath);
        total += stat.size;
      }
    }
    return total;
  } catch {
    return 0;
  }
}

module.exports = {
  cleanupExpiredSessions,
  cleanupSystemLogs,
  cleanupOrganization,
  getIdleAccounts,
  cleanupOrphanFiles,
  getStorageStats,
};
