const cron = require('node-cron');
const prisma = require('../../lib/prisma');
const {
  cleanupExpiredSessions,
  cleanupSystemLogs,
  cleanupOrganization,
  cleanupOrphanFiles,
  getIdleAccounts,
} = require('../services/cleanupService');
const { sendIdleWarningEmail } = require('../services/email/emailService');
const logger = require('../utils/logger');

let jobs = {};
const running = {};

/**
 * Daily at 2 AM: clean expired sessions + old system logs
 */
function scheduleDailyCleanup() {
  const job = cron.schedule('0 2 * * *', async () => {
    if (running.daily) return;
    running.daily = true;
    try {
      const [sessionStats, sysLogStats] = await Promise.all([
        cleanupExpiredSessions(),
        cleanupSystemLogs(),
      ]);
      logger.info('[Cleanup] Daily sessions cleanup', sessionStats);
      if (sysLogStats.systemLogs > 0) {
        logger.info(`[Cleanup] Deleted ${sysLogStats.systemLogs} old system logs`);
      }
    } catch (err) {
      logger.error('[Cleanup] Daily cleanup failed:', err.message);
    } finally {
      running.daily = false;
    }
  }, { scheduled: false });

  jobs.daily = job;
  return job;
}

/**
 * Weekly Sunday at 3 AM: retention cleanup for each non-ENTERPRISE org
 */
function scheduleWeeklyRetention() {
  const job = cron.schedule('0 3 * * 0', async () => {
    if (running.weekly) return;
    running.weekly = true;
    try {
      const orgs = await prisma.organization.findMany({
        where: { plan: { not: 'ENTERPRISE' } },
        select: { id: true, name: true, plan: true },
      });

      let totalStats = {};
      for (const org of orgs) {
        try {
          const stats = await cleanupOrganization(org.id);
          if (stats) {
            for (const [key, val] of Object.entries(stats)) {
              totalStats[key] = (totalStats[key] || 0) + val;
            }
          }
        } catch (err) {
          logger.error(`[Cleanup] Retention failed for org ${org.name}:`, err.message);
        }
      }

      logger.info('[Cleanup] Weekly retention cleanup complete', { orgsProcessed: orgs.length, ...totalStats });
    } catch (err) {
      logger.error('[Cleanup] Weekly retention cleanup failed:', err.message);
    } finally {
      running.weekly = false;
    }
  }, { scheduled: false });

  jobs.weekly = job;
  return job;
}

/**
 * Monthly 1st at 4 AM: orphan files + idle accounts
 */
function scheduleMonthlyMaintenance() {
  const job = cron.schedule('0 4 1 * *', async () => {
    if (running.monthly) return;
    running.monthly = true;
    try {
      const orphanStats = await cleanupOrphanFiles();
      logger.info('[Cleanup] Monthly orphan files cleanup', orphanStats);

      const idleAccounts = await getIdleAccounts(180);
      if (idleAccounts.length > 0) {
        logger.warn(`[Cleanup] Found ${idleAccounts.length} idle accounts (180+ days)`, {
          accounts: idleAccounts.map((a) => ({ name: a.name, plan: a.plan, lastLogin: a.lastLogin })),
        });

        // Send idle warning emails to org admins
        for (const account of idleAccounts) {
          try {
            const admin = await prisma.user.findFirst({
              where: { organizationId: account.id, roles: { some: { role: { key: 'admin' } } } },
              select: { email: true, firstName: true, lastName: true },
            });
            if (admin?.email) {
              await sendIdleWarningEmail({
                email: admin.email,
                userName: `${admin.firstName} ${admin.lastName}`,
                organizationName: account.name,
                idleDays: 180,
                plan: account.plan,
              });
            }
          } catch (emailErr) {
            logger.error(`[Cleanup] Failed to send idle warning for ${account.name}:`, emailErr.message);
          }
        }
      }
    } catch (err) {
      logger.error('[Cleanup] Monthly maintenance failed:', err.message);
    } finally {
      running.monthly = false;
    }
  }, { scheduled: false });

  jobs.monthly = job;
  return job;
}

function startAllJobs() {
  scheduleDailyCleanup();
  scheduleWeeklyRetention();
  scheduleMonthlyMaintenance();

  Object.values(jobs).forEach((job) => job.start());
  logger.info('[Cleanup] All cleanup jobs started');
}

function stopAllJobs() {
  Object.values(jobs).forEach((job) => job.stop());
  jobs = {};
}

function getJobsStatus() {
  return {
    daily: jobs.daily ? 'running' : 'stopped',
    weekly: jobs.weekly ? 'running' : 'stopped',
    monthly: jobs.monthly ? 'running' : 'stopped',
  };
}

module.exports = {
  startAllJobs,
  stopAllJobs,
  getJobsStatus,
};
