const { google } = require('googleapis');
const crypto = require('crypto');
const logger = require('../../utils/logger');

// Encryption configuration (reuse from ANAF pattern)
const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.GOOGLE_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY;

/**
 * Encrypt sensitive data
 */
const encrypt = (text) => {
  if (!ENCRYPTION_KEY) {
    logger.warn('Encryption key not set, storing tokens in plain text');
    return text;
  }
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Decrypt sensitive data
 */
const decrypt = (encryptedText) => {
  if (!ENCRYPTION_KEY || !encryptedText.includes(':')) {
    return encryptedText;
  }
  try {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    logger.error('Failed to decrypt token:', error);
    return encryptedText;
  }
};

/**
 * Get OAuth2 client
 */
const getOAuth2Client = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.API_BASE_URL}/api/integrations/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
};

/**
 * Generate authorization URL
 */
const getAuthUrl = (state) => {
  const oauth2Client = getOAuth2Client();

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state,
    prompt: 'consent', // Force consent to get refresh token
  });
};

/**
 * Exchange authorization code for tokens
 */
const exchangeCodeForTokens = async (code) => {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = async (refreshToken) => {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    refresh_token: decrypt(refreshToken),
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  return credentials;
};

/**
 * Store Google calendar config for user (per-location)
 */
const storeCalendarConfig = async (prisma, userId, tokens, locationId = null) => {
  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + 3600 * 1000);

  return prisma.googleCalendarConfig.upsert({
    where: {
      userId_locationId: {
        userId,
        locationId: locationId || null,
      },
    },
    update: {
      accessToken: encrypt(tokens.access_token),
      refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
      expiresAt,
      updatedAt: new Date(),
    },
    create: {
      userId,
      locationId: locationId || null,
      accessToken: encrypt(tokens.access_token),
      refreshToken: encrypt(tokens.refresh_token),
      expiresAt,
    },
  });
};

/**
 * Get user's calendar config for a specific location (or default)
 */
const getCalendarConfig = async (prisma, userId, locationId = null) => {
  return prisma.googleCalendarConfig.findUnique({
    where: {
      userId_locationId: {
        userId,
        locationId: locationId || null,
      },
    },
  });
};

/**
 * Get all calendar configs for a user (all locations)
 */
const getAllCalendarConfigs = async (prisma, userId) => {
  return prisma.googleCalendarConfig.findMany({
    where: { userId },
    include: {
      location: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
};

/**
 * Get authenticated Google Calendar client
 */
const getAuthenticatedCalendarClient = async (prisma, userId, locationId = null) => {
  const config = await getCalendarConfig(prisma, userId, locationId);

  if (!config) {
    throw new Error('Google Calendar not connected');
  }

  const oauth2Client = getOAuth2Client();

  // Check if token needs refresh
  const now = new Date();
  if (config.expiresAt <= now) {
    try {
      const newCredentials = await refreshAccessToken(config.refreshToken);
      await storeCalendarConfig(prisma, userId, newCredentials, locationId);
      oauth2Client.setCredentials({
        access_token: newCredentials.access_token,
        refresh_token: decrypt(config.refreshToken),
      });
    } catch (error) {
      logger.error('Failed to refresh Google token:', error);
      throw new Error('Failed to refresh Google Calendar access. Please reconnect.');
    }
  } else {
    oauth2Client.setCredentials({
      access_token: decrypt(config.accessToken),
      refresh_token: decrypt(config.refreshToken),
    });
  }

  return google.calendar({ version: 'v3', auth: oauth2Client });
};

/**
 * Disconnect Google Calendar for a specific location (or default)
 */
const disconnectCalendar = async (prisma, userId, locationId = null) => {
  const config = await getCalendarConfig(prisma, userId, locationId);

  if (!config) {
    return { success: true };
  }

  // Revoke token if possible
  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: decrypt(config.accessToken),
    });
    await oauth2Client.revokeCredentials();
  } catch (error) {
    logger.warn('Failed to revoke Google token:', error);
  }

  // Delete all synced events
  await prisma.calendarEventSync.deleteMany({
    where: { configId: config.id },
  });

  // Delete config
  await prisma.googleCalendarConfig.delete({
    where: {
      userId_locationId: {
        userId,
        locationId: locationId || null,
      },
    },
  });

  return { success: true };
};

/**
 * Check if user has Google Calendar connected (for a specific location or default)
 */
const isConnected = async (prisma, userId, locationId = null) => {
  const config = await getCalendarConfig(prisma, userId, locationId);
  return !!config;
};

/**
 * Get connection status - returns ALL configs for the user with location info
 */
const getConnectionStatus = async (prisma, userId) => {
  const configs = await getAllCalendarConfigs(prisma, userId);

  if (!configs || configs.length === 0) {
    return {
      connected: false,
      configs: [],
    };
  }

  return {
    connected: true,
    configs: configs.map((config) => ({
      id: config.id,
      locationId: config.locationId,
      locationName: config.location?.name || null,
      calendarId: config.calendarId,
      syncEnabled: config.syncEnabled,
      lastSyncAt: config.lastSyncAt,
      createdAt: config.createdAt,
    })),
  };
};

module.exports = {
  getAuthUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  storeCalendarConfig,
  getCalendarConfig,
  getAllCalendarConfigs,
  getAuthenticatedCalendarClient,
  disconnectCalendar,
  isConnected,
  getConnectionStatus,
  encrypt,
  decrypt,
};
