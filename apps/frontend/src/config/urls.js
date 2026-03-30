/**
 * Cross-app URL configuration.
 * Values come from Vite env variables (VITE_*), falling back to localhost for dev.
 * In production these are set via Docker ARGs or .env files.
 */
export const CLIENT_PORTAL_URL = import.meta.env.CLIENT_PORTAL_URL || 'http://localhost:5174';
export const WEBSITE_BASE_URL = import.meta.env.WEBSITE_BASE_URL || 'http://localhost:5175';
