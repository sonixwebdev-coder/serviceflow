import { createRuntimeConfig } from '@serviceflow/runtime-config';

export const runtimeConfig = createRuntimeConfig({
  apiUrl: import.meta.env.VITE_API_URL,
  platformName: import.meta.env.VITE_PLATFORM_NAME,
  platformUrl: import.meta.env.VITE_PLATFORM_URL,
  platformContactEmail: import.meta.env.VITE_PLATFORM_CONTACT_EMAIL,
});
