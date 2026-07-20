import { createRuntimeConfig } from '@serviceflow/runtime-config';

export const runtimeConfig = createRuntimeConfig({
  apiUrl: import.meta.env.VITE_API_URL,
  socketUrl: import.meta.env.VITE_SOCKET_URL,
  portalUrl: import.meta.env.VITE_CLIENT_PORTAL_URL,
  websiteUrl: import.meta.env.VITE_WEBSITE_BASE_URL,
  platformName: import.meta.env.VITE_PLATFORM_NAME,
  platformUrl: import.meta.env.VITE_PLATFORM_URL,
  platformContactEmail: import.meta.env.VITE_PLATFORM_CONTACT_EMAIL,
});

export const buildHostedWebsiteUrl = (subdomain) =>
  `${runtimeConfig.websiteUrl}/${subdomain || 'company'}`;
