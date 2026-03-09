let SentryModule = null;

export async function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  try {
    // Dynamic module name to prevent Vite/Rollup from resolving at build time
    const moduleName = ['@sentry', 'react'].join('/');
    SentryModule = await import(/* @vite-ignore */ moduleName);
    SentryModule.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    });
  } catch (err) {
    console.warn('Sentry initialization skipped:', err.message);
    SentryModule = null;
  }
}

export function captureException(err, context) {
  if (!SentryModule) return;
  SentryModule.withScope((scope) => {
    if (context) {
      scope.setExtras(context);
    }
    SentryModule.captureException(err);
  });
}
