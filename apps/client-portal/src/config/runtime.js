import { createRuntimeConfig } from '@serviceflow/runtime-config';

export const runtimeConfig = createRuntimeConfig({
  apiUrl: import.meta.env.VITE_API_URL,
  socketUrl: import.meta.env.VITE_WS_URL,
  appUrl: import.meta.env.VITE_FRONTEND_URL,
  websiteUrl: import.meta.env.VITE_WEBSITE_BASE_URL,
  platformName: import.meta.env.VITE_PLATFORM_NAME,
  platformUrl: import.meta.env.VITE_PLATFORM_URL,
  platformContactEmail: import.meta.env.VITE_PLATFORM_CONTACT_EMAIL,
});
