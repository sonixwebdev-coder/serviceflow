const { getPlatformConfig } = require('../config/platform');
const { ok } = require('../utils/http');

const createApiHealthHandler = ({ now = () => new Date() } = {}) => {
  return async (req, res) =>
    ok(res, { timestamp: now().toISOString() }, `${getPlatformConfig().name} API is healthy`);
};

module.exports = { createApiHealthHandler };
