const cron = require('node-cron');
const prisma = require('../../lib/prisma');
const { sendTrialExpiredEmail, sendTrialEndingEmail } = require('../services/email/emailService');
const logger = require('../utils/logger');

let job = null;
let running = false;

/**
 * Hourly cron that handles:
 * 1. Expire trials: TRIAL orgs past trialEndsAt → PAYMENT_REQUIRED + email
 * 2. Trial ending warnings: TRIAL orgs within 3 days of expiry → warning email
 */
function scheduleSubscriptionCheck() {
  job = cron.schedule(
    '0 * * * *',
    async () => {
      if (running) return;
      running = true;

      try {
        const now = new Date();
        let expiredCount = 0;
        let warningCount = 0;

        // 1. Expire trials past their end date
        const expiredTrials = await prisma.organization.findMany({
          where: {
            status: 'TRIAL',
            trialEndsAt: { lt: now },
          },
          select: { id: true, name: true },
        });

        for (const org of expiredTrials) {
          await prisma.organization.update({
            where: { id: org.id },
            data: { status: 'PAYMENT_REQUIRED' },
          });

          // Send trial expired email to admin (fire-and-forget)
          const admin = await prisma.user.findFirst({
            where: { organizationId: org.id, roles: { some: { role: { key: 'admin' } } } },
            select: { email: true, firstName: true, lastName: true },
          });
          if (admin?.email) {
            sendTrialExpiredEmail({
              email: admin.email,
              userName: `${admin.firstName} ${admin.lastName}`.trim(),
              organizationName: org.name,
            }).catch((err) => logger.error('[EMAIL] Trial expired email failed:', err.message));
          }

          expiredCount++;
        }

        // 2. Trial ending warnings (within 3 days, not yet expired)
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        const expiringTrials = await prisma.organization.findMany({
          where: {
            status: 'TRIAL',
            trialEndsAt: {
              gt: now,
              lte: threeDaysFromNow,
            },
          },
          select: { id: true, name: true, plan: true, trialEndsAt: true },
        });

        for (const org of expiringTrials) {
          // Check if we already sent a warning email in the last 3 days
          const recentWarning = await prisma.systemLog.findFirst({
            where: {
              category: 'EMAIL',
              message: { contains: `trial-warning:${org.id}` },
              createdAt: { gte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
            },
          });

          if (recentWarning) continue;

          const admin = await prisma.user.findFirst({
            where: { organizationId: org.id, roles: { some: { role: { key: 'admin' } } } },
            select: { email: true, firstName: true, lastName: true },
          });

          if (admin?.email) {
            const daysLeft = Math.max(
              0,
              Math.ceil((new Date(org.trialEndsAt) - now) / (1000 * 60 * 60 * 24))
            );
            sendTrialEndingEmail({
              email: admin.email,
              userName: `${admin.firstName} ${admin.lastName}`.trim(),
              organizationName: org.name,
              plan: org.plan,
              daysLeft,
              trialEndDate: new Date(org.trialEndsAt).toLocaleDateString('ro-RO'),
            }).catch((err) => logger.error('[EMAIL] Trial ending email failed:', err.message));

            // Log so we don't send duplicates
            await prisma.systemLog.create({
              data: {
                level: 'INFO',
                category: 'EMAIL',
                message: `trial-warning:${org.id}`,
              },
            });

            warningCount++;
          }
        }

        if (expiredCount > 0 || warningCount > 0) {
          logger.info('[SubscriptionJob] Summary', { expiredCount, warningCount });
        }
      } catch (err) {
        logger.error('[SubscriptionJob] Failed:', err.message);
      } finally {
        running = false;
      }
    },
    { scheduled: false }
  );

  return job;
}

function startAllJobs() {
  scheduleSubscriptionCheck();
  if (job) job.start();
  logger.info('[SubscriptionJob] Started (hourly)');
}

function stopAllJobs() {
  if (job) job.stop();
}

function getJobsStatus() {
  return {
    subscriptionCheck: job ? 'scheduled' : 'not started',
  };
}

module.exports = {
  startAllJobs,
  stopAllJobs,
  getJobsStatus,
};
