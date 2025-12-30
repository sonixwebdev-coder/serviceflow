const axios = require('axios');
const crypto = require('crypto');
const { AppError } = require('../../utils/errors');
const prisma = require('../../../lib/prisma');

/**
 * ANAF OAuth2 Service
 * Handles authentication flow with ANAF E-Factura system
 */

const ANAF_AUTHORIZATION_URL = process.env.ANAF_AUTHORIZATION_URL ||
  'https://logincert.anaf.ro/anaf-oauth2/v1/authorize';
const ANAF_TOKEN_URL = process.env.ANAF_TOKEN_URL ||
  'https://logincert.anaf.ro/anaf-oauth2/v1/token';

/**
 * Get encryption key from environment
 * @returns {Buffer} 32-byte encryption key
 */
function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new AppError('ENCRYPTION_KEY not configured. Please set ENCRYPTION_KEY environment variable.', 500);
  }

  // Ensure key is 32 bytes (64 hex characters)
  if (key.length !== 64) {
    throw new AppError('ENCRYPTION_KEY must be 64 hex characters (32 bytes). Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"', 500);
  }

  return Buffer.from(key, 'hex');
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * @param {string} text - Text to encrypt
 * @returns {string} Encrypted text with format: iv:authTag:encryptedData
 */
function encrypt(text) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16); // 128-bit IV for GCM

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Get authentication tag
  const authTag = cipher.getAuthTag();

  // Return: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data encrypted with AES-256-GCM
 * @param {string} encryptedText - Text to decrypt (format: iv:authTag:encryptedData)
 * @returns {string} Decrypted text
 */
function decrypt(encryptedText) {
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format. Expected format: iv:authTag:encryptedData');
    }

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error.message);
    throw new AppError('Failed to decrypt client secret. Data may be corrupted or encryption key may have changed.', 500);
  }
}

/**
 * Generate authorization URL for OAuth2 flow
 * @param {Object} config - ANAF configuration
 * @param {string} state - Optional state parameter for CSRF protection
 * @returns {string} Authorization URL
 */
function getAuthorizationUrl(config, state = null) {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'EFACTURA',
  });

  if (state) {
    params.append('state', state);
  }

  return `${ANAF_AUTHORIZATION_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 * @param {string} code - Authorization code from ANAF
 * @param {Object} config - ANAF configuration
 * @returns {Promise<Object>} Token data
 */
async function exchangeCodeForToken(code, config) {
  try {
    const clientSecret = decrypt(config.clientSecret);

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: clientSecret,
      token_content_type: 'jwt',
    });

    const response = await axios.post(ANAF_TOKEN_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 30000,
    });

    if (!response.data || !response.data.access_token) {
      throw new AppError('Invalid token response from ANAF', 500);
    }

    // Calculate expiry dates
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days
    const refreshExpiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 365 days

    // Store token in database
    const tokenData = {
      configId: config.id,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt,
      refreshExpiresAt,
      tokenType: response.data.token_type || 'Bearer',
      scope: response.data.scope || 'EFACTURA',
    };

    // Delete old tokens and create new one
    await prisma.anafToken.deleteMany({
      where: { configId: config.id },
    });

    const token = await prisma.anafToken.create({
      data: tokenData,
    });

    return {
      ...token,
      isValid: true,
      daysUntilExpiry: 90,
    };
  } catch (error) {
    if (error.response) {
      throw new AppError(
        `ANAF OAuth error: ${error.response.data?.error_description || error.response.data?.error || 'Unknown error'}`,
        error.response.status
      );
    }
    throw error;
  }
}

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @param {Object} config - ANAF configuration
 * @returns {Promise<Object>} New token data
 */
async function refreshAccessToken(refreshToken, config) {
  try {
    const clientSecret = decrypt(config.clientSecret);

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: clientSecret,
      token_content_type: 'jwt',
    });

    const response = await axios.post(ANAF_TOKEN_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 30000,
    });

    if (!response.data || !response.data.access_token) {
      throw new AppError('Invalid token refresh response from ANAF', 500);
    }

    // Calculate new expiry dates
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days
    const refreshExpiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 365 days

    // Update token in database
    const existingToken = await prisma.anafToken.findFirst({
      where: { configId: config.id },
    });

    if (existingToken) {
      const updatedToken = await prisma.anafToken.update({
        where: { id: existingToken.id },
        data: {
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
          expiresAt,
          refreshExpiresAt,
          updatedAt: new Date(),
        },
      });

      return {
        ...updatedToken,
        isValid: true,
        daysUntilExpiry: 90,
      };
    } else {
      // Create new token if none exists
      const newToken = await prisma.anafToken.create({
        data: {
          configId: config.id,
          accessToken: response.data.access_token,
          refreshToken: response.data.refresh_token,
          expiresAt,
          refreshExpiresAt,
          tokenType: response.data.token_type || 'Bearer',
          scope: response.data.scope || 'EFACTURA',
        },
      });

      return {
        ...newToken,
        isValid: true,
        daysUntilExpiry: 90,
      };
    }
  } catch (error) {
    if (error.response) {
      throw new AppError(
        `ANAF token refresh error: ${error.response.data?.error_description || error.response.data?.error || 'Unknown error'}`,
        error.response.status
      );
    }
    throw error;
  }
}

/**
 * Validate token and check if it's expired or needs refresh
 * @param {Object} token - Token object from database
 * @returns {Object} Validation result
 */
function validateToken(token) {
  if (!token) {
    return {
      isValid: false,
      needsRefresh: true,
      isExpired: true,
      daysUntilExpiry: 0,
      reason: 'Token not found',
    };
  }

  const now = new Date();
  const expiresAt = new Date(token.expiresAt);
  const refreshExpiresAt = new Date(token.refreshExpiresAt);

  // Check if access token is expired
  if (now >= expiresAt) {
    // Check if refresh token is still valid
    if (now < refreshExpiresAt) {
      return {
        isValid: false,
        needsRefresh: true,
        isExpired: true,
        daysUntilExpiry: 0,
        reason: 'Access token expired, refresh token valid',
      };
    } else {
      return {
        isValid: false,
        needsRefresh: false,
        isExpired: true,
        daysUntilExpiry: 0,
        reason: 'Both access and refresh tokens expired',
      };
    }
  }

  // Calculate days until expiry
  const daysUntilExpiry = Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24));

  // Recommend refresh if less than 5 days until expiry
  const needsRefresh = daysUntilExpiry < 5;

  return {
    isValid: true,
    needsRefresh,
    isExpired: false,
    daysUntilExpiry,
    reason: needsRefresh ? 'Token expires soon, refresh recommended' : 'Token valid',
  };
}

/**
 * Get valid token for a configuration (auto-refresh if needed)
 * @param {string} configId - Configuration ID
 * @returns {Promise<Object>} Valid token
 */
async function getValidToken(configId) {
  const config = await prisma.anafConfig.findUnique({
    where: { id: configId },
    include: { tokens: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });

  if (!config) {
    throw new AppError('ANAF configuration not found', 404);
  }

  if (!config.isActive) {
    throw new AppError('ANAF configuration is disabled', 403);
  }

  const token = config.tokens[0];
  const validation = validateToken(token);

  // If token is valid but needs refresh, refresh it
  if (validation.isValid && validation.needsRefresh) {
    try {
      const refreshedToken = await refreshAccessToken(token.refreshToken, config);
      return refreshedToken;
    } catch (error) {
      // If refresh fails but token is still valid, use existing token
      if (validation.isValid) {
        return token;
      }
      throw error;
    }
  }

  // If token is invalid, refresh it
  if (!validation.isValid && validation.needsRefresh) {
    const refreshedToken = await refreshAccessToken(token.refreshToken, config);
    return refreshedToken;
  }

  // If both tokens expired, throw error
  if (validation.isExpired && !validation.needsRefresh) {
    throw new AppError('ANAF tokens expired. Please re-authenticate.', 401);
  }

  return token;
}

module.exports = {
  encrypt,
  decrypt,
  getAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  validateToken,
  getValidToken,
};
