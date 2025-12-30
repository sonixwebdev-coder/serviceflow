// ANAF functionality temporarily disabled
// const anafJobs = require('./anafSyncJob');

/**
 * Initialize all background jobs
 */
function initializeJobs() {
  // ANAF functionality temporarily disabled
  // Start ANAF jobs based on environment configuration
  // const anafConfig = {
  //   enableAutoSubmit: process.env.ANAF_ENABLE_AUTO_SUBMIT === 'true',
  //   enableStatusSync: process.env.ANAF_ENABLE_STATUS_SYNC !== 'false', // Default true
  //   enableTokenRefresh: process.env.ANAF_ENABLE_TOKEN_REFRESH !== 'false', // Default true
  //   enableMessageDownload: process.env.ANAF_ENABLE_MESSAGE_DOWNLOAD !== 'false', // Default true
  //   enableRetryFailed: process.env.ANAF_ENABLE_RETRY_FAILED !== 'false', // Default true
  // };

  // anafJobs.startAllJobs(anafConfig);
}

/**
 * Stop all background jobs
 */
function stopAllJobs() {
  // ANAF functionality temporarily disabled
  // anafJobs.stopAllJobs();
}

/**
 * Get status of all jobs
 */
function getJobsStatus() {
  return {
    // ANAF functionality temporarily disabled
    // anaf: anafJobs.getJobsStatus(),
  };
}

module.exports = {
  initializeJobs,
  stopAllJobs,
  getJobsStatus,
  // ANAF functionality temporarily disabled
  // anafJobs,
};
