const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_TTL || '1h';
const REFRESH_TOKEN_TTL_DAYS = parseInt(process.env.JWT_REFRESH_TTL_DAYS || '30', 10);

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const signAccessToken = (payload, options = {}) => {
  if (!process.env.JWT_ACCESS_SECRET) {
    throw new Error('JWT_ACCESS_SECRET is not configured');
  }

  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL,
    ...options,
  });
};

const verifyAccessToken = (token) => {
  if (!process.env.JWT_ACCESS_SECRET) {
    throw new Error('JWT_ACCESS_SECRET is not configured');
  }

  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
};

const generateRefreshToken = () => {
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = addDays(new Date(), REFRESH_TOKEN_TTL_DAYS);

  return { token, expiresAt };
};

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  REFRESH_TOKEN_TTL_DAYS,
};
