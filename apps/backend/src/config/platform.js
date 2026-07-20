const DEFAULT_PLATFORM = Object.freeze({
  name: 'ServiceFlow',
  url: 'http://localhost:5173',
  contactEmail: 'contact@example.com',
});

const getPlatformConfig = () => ({
  name: process.env.PLATFORM_NAME?.trim() || DEFAULT_PLATFORM.name,
  url: process.env.PLATFORM_URL?.trim() || DEFAULT_PLATFORM.url,
  contactEmail: process.env.PLATFORM_CONTACT_EMAIL?.trim() || DEFAULT_PLATFORM.contactEmail,
});

module.exports = { DEFAULT_PLATFORM, getPlatformConfig };
