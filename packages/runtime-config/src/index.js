const trimTrailingSlash = (value) => value?.replace(/\/+$/, '');

const deriveServerUrl = (apiUrl) => trimTrailingSlash(apiUrl)?.replace(/\/api$/, '');

const definedValues = (values) =>
  Object.fromEntries(
    Object.entries(values || {}).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    )
  );

export const SERVICEFLOW_DEFAULTS = Object.freeze({
  platformName: 'ServiceFlow',
  platformUrl: 'http://localhost:5173',
  platformContactEmail: 'contact@example.com',
  apiUrl: 'http://localhost:5000/api',
  socketUrl: 'http://localhost:5000',
  appUrl: 'http://localhost:5173',
  portalUrl: 'http://localhost:5174',
  websiteUrl: 'http://localhost:5175',
  adminUrl: 'http://localhost:5176',
});

export const createRuntimeConfig = (fallbacks = {}) => {
  const runtime = globalThis.window?.__SERVICEFLOW_CONFIG__ || {};
  const merged = {
    ...SERVICEFLOW_DEFAULTS,
    ...definedValues(fallbacks),
    ...definedValues(runtime),
  };
  const apiUrl = trimTrailingSlash(merged.apiUrl);

  return Object.freeze({
    ...merged,
    apiUrl,
    serverUrl: trimTrailingSlash(merged.serverUrl) || deriveServerUrl(apiUrl),
    socketUrl: trimTrailingSlash(merged.socketUrl) || deriveServerUrl(apiUrl),
    platformUrl: trimTrailingSlash(merged.platformUrl),
    appUrl: trimTrailingSlash(merged.appUrl),
    portalUrl: trimTrailingSlash(merged.portalUrl),
    websiteUrl: trimTrailingSlash(merged.websiteUrl),
    adminUrl: trimTrailingSlash(merged.adminUrl),
  });
};
