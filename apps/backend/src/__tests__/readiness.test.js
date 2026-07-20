const { createReadinessHandler } = require('../health/readiness');

const createResponse = () => {
  const response = {
    status: jest.fn(() => response),
    json: jest.fn(() => response),
  };
  return response;
};

describe('readiness handler', () => {
  const now = () => new Date('2026-07-20T12:00:00.000Z');

  it('reports ready when PostgreSQL and Redis respond', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const redis = { ping: jest.fn().mockResolvedValue('PONG') };
    const response = createResponse();

    await createReadinessHandler({ prisma, getRedisClient: () => redis, now })({}, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      status: 'OK',
      checks: { db: true, redis: true },
      timestamp: '2026-07-20T12:00:00.000Z',
    });
  });

  it('keeps Redis optional when it is not configured', async () => {
    const prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const response = createResponse();

    await createReadinessHandler({ prisma, getRedisClient: () => null, now })({}, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ checks: { db: true, redis: null } })
    );
  });

  it('reports degraded without leaking database errors', async () => {
    const prisma = { $queryRaw: jest.fn().mockRejectedValue(new Error('connection details')) };
    const redis = { ping: jest.fn().mockRejectedValue(new Error('redis details')) };
    const response = createResponse();

    await createReadinessHandler({ prisma, getRedisClient: () => redis, now })({}, response);

    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({
      status: 'DEGRADED',
      checks: { db: false, redis: false },
      timestamp: '2026-07-20T12:00:00.000Z',
    });
  });
});
