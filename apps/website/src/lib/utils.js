import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { runtimeConfig } from '../config/runtime';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const FILE_BASE_URL = runtimeConfig.serverUrl;

/**
 * Resolve a relative file path (e.g. /files/logos/img.png) to a full URL
 * pointing at the API file server. Returns full URLs unchanged.
 */
export function resolveFileUrl(filePath) {
  if (!filePath) return '';
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  const normalized = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return `${FILE_BASE_URL}${normalized}`;
}

/**
 * Convert hex color to CSS custom property format
 */
export function hexToRGB(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Generate color shades from a base color
 */
export function generateColorShades(hex) {
  const rgb = hexToRGB(hex);
  if (!rgb) return {};

  // Simple shade generation - in production would use a proper color library
  return {
    50: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.05)`,
    100: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`,
    200: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`,
    300: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`,
    400: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`,
    500: hex,
    600: hex,
    700: hex,
    800: hex,
    900: hex,
  };
}

/**
 * Apply branding colors to CSS custom properties
 */
export function applyBranding(branding) {
  if (!branding) return;

  const root = document.documentElement;

  if (branding.primaryColor) {
    root.style.setProperty('--color-primary-500', branding.primaryColor);
    root.style.setProperty('--color-primary-600', branding.primaryColor);
  }

  if (branding.secondaryColor) {
    root.style.setProperty('--color-secondary-500', branding.secondaryColor);
    root.style.setProperty('--color-secondary-600', branding.secondaryColor);
  }
}
