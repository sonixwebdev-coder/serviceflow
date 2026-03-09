let Sentry = null;

function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  try {
    Sentry = require('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
  } catch (err) {
    console.warn('Sentry initialization failed (is @sentry/node installed?):', err.message);
    Sentry = null;
  }
}

function captureException(err, context) {
  if (!Sentry) return;
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    Sentry.captureException(err);
  });
}

module.exports = { initSentry, captureException };
