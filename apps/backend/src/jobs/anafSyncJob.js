const cron = require('node-cron');
const prisma = require('../../lib/prisma');
const {
  syncPendingInvoices,
  downloadAnafMessages,
  getAnafConfig,
} = require('../services/anaf/anafInvoiceService');
const { getValidToken, refreshAccessToken } = require('../services/anaf/anafOAuthService');

/**
 * ANAF Background Sync Jobs
 * Automated tasks for invoice synchronization and token management
 */

let jobs = {};

/**
 * Status sync job - Check pending uploads every 5 minutes
 */
function scheduleStatusSync() {
  // Run every 5 minutes
  const job = cron.schedule('*/5 * * * *', async () => {
    try {

      const result = await syncPendingInvoices({ limit: 20 });

        checked: result.checked,
        completed: result.completed,
        errors: result.errors,
      });

      // Log errors if any
      if (result.errors > 0) {
        const errorDetails = result.details
          .filter(d => !d.success)
          .map(d => `Invoice ${d.invoiceNumber}: ${d.error}`)
          .join(', ');
        console.error('[ANAF Job] Status sync errors:', errorDetails);
      }
    } catch (error) {
      console.error('[ANAF Job] Status sync failed:', error.message);
    }
  }, {
    scheduled: false, // Don't start immediately
  });

  jobs.statusSync = job;
  return job;
}

/**
 * Token refresh job - Refresh tokens 5 days before expiry
 * Runs daily at 2 AM
 */
function scheduleTokenRefresh() {
  const job = cron.schedule('0 2 * * *', async () => {
    try {

      const configs = await prisma.anafConfig.findMany({
        where: { isActive: true },
        include: {
          tokens: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      let refreshed = 0;
      let errors = 0;

      for (const config of configs) {
        try {
          const token = config.tokens[0];

          if (!token) {
            continue;
          }

          const now = new Date();
          const expiresAt = new Date(token.expiresAt);
          const daysUntilExpiry = Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24));

          // Refresh if less than 5 days until expiry
          if (daysUntilExpiry <= 5 && daysUntilExpiry >= 0) {

            await refreshAccessToken(token.refreshToken, config);
            refreshed++;

          } else if (daysUntilExpiry < 0) {
            console.warn(`[ANAF Job] Token expired for config ${config.id}. Manual re-authentication required.`);
            errors++;
          }
        } catch (error) {
          console.error(`[ANAF Job] Failed to refresh token for config ${config.id}:`, error.message);
          errors++;
        }
      }

        total: configs.length,
        refreshed,
        errors,
      });
    } catch (error) {
      console.error('[ANAF Job] Token refresh job failed:', error.message);
    }
  }, {
    scheduled: false,
  });

  jobs.tokenRefresh = job;
  return job;
}

/**
 * Message download job - Download new messages from ANAF
 * Runs daily at 3 AM
 */
function scheduleMessageDownload() {
  const job = cron.schedule('0 3 * * *', async () => {
    try {

      const result = await downloadAnafMessages({ days: 7, filter: 'T' });

        total: result.totalMessages,
        new: result.newMessages,
      });
    } catch (error) {
      console.error('[ANAF Job] Message download failed:', error.message);
    }
  }, {
    scheduled: false,
  });

  jobs.messageDownload = job;
  return job;
}

/**
 * Retry failed invoices job - Retry invoices with errors
 * Runs daily at 4 AM
 */
function scheduleRetryFailed() {
  const job = cron.schedule('0 4 * * *', async () => {
    try {

      // Find failed invoices that haven't exceeded max retries
      const failedSyncs = await prisma.anafInvoiceSync.findMany({
        where: {
          status: 'ERROR',
          retryCount: {
            lt: prisma.raw('max_retries'),
          },
        },
        take: 10,
        orderBy: {
          updatedAt: 'asc',
        },
        include: {
          invoice: {
            select: {
              invoiceNumber: true,
            },
          },
        },
      });

      let retried = 0;
      let succeeded = 0;
      let failed = 0;

      for (const sync of failedSyncs) {
        try {

          const { submitInvoiceToAnaf } = require('../services/anaf/anafInvoiceService');
          await submitInvoiceToAnaf(sync.invoiceId, { forceResubmit: true });

          retried++;
          succeeded++;

        } catch (error) {
          console.error(`[ANAF Job] Failed to retry invoice ${sync.invoice.invoiceNumber}:`, error.message);
          retried++;
          failed++;
        }
      }

        total: failedSyncs.length,
        retried,
        succeeded,
        failed,
      });
    } catch (error) {
      console.error('[ANAF Job] Retry job failed:', error.message);
    }
  }, {
    scheduled: false,
  });

  jobs.retryFailed = job;
  return job;
}

/**
 * Auto-submit new invoices job - Automatically submit eligible invoices
 * Runs every 15 minutes
 */
function scheduleAutoSubmit() {
  const job = cron.schedule('*/15 * * * *', async () => {
    try {

      // Find invoices that are SENT but not yet submitted to ANAF
      const eligibleInvoices = await prisma.invoice.findMany({
        where: {
          status: 'SENT',
          anafSync: null, // Not yet submitted
        },
        take: 10,
        orderBy: {
          sentAt: 'desc',
        },
        select: {
          id: true,
          invoiceNumber: true,
        },
      });

      let submitted = 0;
      let errors = 0;

      for (const invoice of eligibleInvoices) {
        try {

          const { submitInvoiceToAnaf } = require('../services/anaf/anafInvoiceService');
          await submitInvoiceToAnaf(invoice.id);

          submitted++;
        } catch (error) {
          console.error(`[ANAF Job] Failed to auto-submit invoice ${invoice.invoiceNumber}:`, error.message);
          errors++;
        }
      }

      if (eligibleInvoices.length > 0) {
          eligible: eligibleInvoices.length,
          submitted,
          errors,
        });
      }
    } catch (error) {
      console.error('[ANAF Job] Auto-submit job failed:', error.message);
    }
  }, {
    scheduled: false,
  });

  jobs.autoSubmit = job;
  return job;
}

/**
 * Start all ANAF background jobs
 * @param {Object} options - Configuration options
 */
function startAllJobs(options = {}) {
  const {
    enableStatusSync = true,
    enableTokenRefresh = true,
    enableMessageDownload = true,
    enableRetryFailed = true,
    enableAutoSubmit = false, // Disabled by default for safety
  } = options;


  if (enableStatusSync) {
    const statusJob = scheduleStatusSync();
    statusJob.start();
  }

  if (enableTokenRefresh) {
    const tokenJob = scheduleTokenRefresh();
    tokenJob.start();
  }

  if (enableMessageDownload) {
    const messageJob = scheduleMessageDownload();
    messageJob.start();
  }

  if (enableRetryFailed) {
    const retryJob = scheduleRetryFailed();
    retryJob.start();
  }

  if (enableAutoSubmit) {
    const autoSubmitJob = scheduleAutoSubmit();
    autoSubmitJob.start();
  }

}

/**
 * Stop all ANAF background jobs
 */
function stopAllJobs() {

  Object.keys(jobs).forEach(jobName => {
    if (jobs[jobName]) {
      jobs[jobName].stop();
    }
  });

  jobs = {};
}

/**
 * Get status of all jobs
 */
function getJobsStatus() {
  return Object.keys(jobs).reduce((acc, jobName) => {
    acc[jobName] = {
      running: jobs[jobName] ? true : false,
    };
    return acc;
  }, {});
}

module.exports = {
  scheduleStatusSync,
  scheduleTokenRefresh,
  scheduleMessageDownload,
  scheduleRetryFailed,
  scheduleAutoSubmit,
  startAllJobs,
  stopAllJobs,
  getJobsStatus,
};
