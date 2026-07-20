const createReadinessHandler = ({ prisma, getRedisClient, now = () => new Date() }) => {
  return async (req, res) => {
    const checks = { db: false, redis: false };

    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.db = true;
    } catch {
      // The response below exposes dependency status without leaking connection details.
    }

    try {
      const redisClient = getRedisClient();
      if (redisClient) {
        await redisClient.ping();
        checks.redis = true;
      } else {
        checks.redis = null;
      }
    } catch {
      // Redis is optional, so database availability remains the readiness gate.
    }

    const healthy = checks.db;
    return res.status(healthy ? 200 : 503).json({
      status: healthy ? 'OK' : 'DEGRADED',
      checks,
      timestamp: now().toISOString(),
    });
  };
};

module.exports = { createReadinessHandler };
