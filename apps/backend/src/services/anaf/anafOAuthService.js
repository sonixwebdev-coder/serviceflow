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
 * Encrypt sensitive data (client_secret)
 * @param {string} text - Text to encrypt
 * @returns {string} Encrypted text
 */
function encrypt(text) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.JWT_ACCESS_SECRET || 'default-key', 'salt', 32);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt sensitive data
 * @param {string} encryptedText - Text to decrypt
 * @returns {string} Decrypted text
 */
function decrypt(encryptedText) {
  try {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(process.env.JWT_ACCESS_SECRET || 'default-key', 'salt', 32);

    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new AppError('Failed to decrypt client secret', 500);
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
