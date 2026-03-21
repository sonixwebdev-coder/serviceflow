const cleanupJobs = require('./cleanupJob');
const notificationJobs = require('./notificationJob');
const subscriptionJobs = require('./subscriptionJob');

/**
 * Initialize all background jobs
 */
function initializeJobs() {
  // Start cleanup jobs
  cleanupJobs.startAllJobs();

  // Start notification jobs (invoice overdue, appointment reminders)
  notificationJobs.startAllJobs();

  // Start subscription jobs (trial expiry, warnings)
  subscriptionJobs.startAllJobs();
}

/**
 * Stop all background jobs
 */
function stopAllJobs() {
  cleanupJobs.stopAllJobs();
  notificationJobs.stopAllJobs();
  subscriptionJobs.stopAllJobs();
}

/**
 * Get status of all jobs
 */
function getJobsStatus() {
  return {
    cleanup: cleanupJobs.getJobsStatus(),
    notifications: notificationJobs.getJobsStatus(),
    subscriptions: subscriptionJobs.getJobsStatus(),
  };
}

module.exports = {
  initializeJobs,
  stopAllJobs,
  getJobsStatus,
  cleanupJobs,
  notificationJobs,
  subscriptionJobs,
};
