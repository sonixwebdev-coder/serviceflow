const { randomUUID } = require('node:crypto');
const { existsSync, readdirSync } = require('node:fs');
const { resolve } = require('node:path');
const Redis = require('ioredis');

const prisma = require('../../lib/prisma');

jest.setTimeout(30000);

describe('PostgreSQL and Redis integration', () => {
  let redis;
  const organizationSlugs = [];

  beforeAll(async () => {
    if (!process.env.DATABASE_URL || !process.env.REDIS_URL) {
      throw new Error('Integration tests require disposable DATABASE_URL and REDIS_URL services');
    }

    await prisma.$connect();
    redis = new Redis(process.env.REDIS_URL, {
      connectTimeout: 5000,
      maxRetriesPerRequest: 1,
    });
    await redis.ping();
  });

  afterAll(async () => {
    if (organizationSlugs.length) {
      await prisma.organization.deleteMany({ where: { slug: { in: organizationSlugs } } });
    }
    if (redis) await redis.quit();
    await prisma.$disconnect();
  });

  it('has every repository migration applied successfully', async () => {
    const migrationsDirectory = resolve(__dirname, '../../../../prisma/migrations');
    const expectedMigrations = readdirSync(migrationsDirectory, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() &&
          existsSync(resolve(migrationsDirectory, entry.name, 'migration.sql'))
      )
      .map(({ name }) => name)
      .sort();
    const migrations = await prisma.$queryRaw`
      SELECT migration_name, finished_at, rolled_back_at
      FROM "_prisma_migrations"
      ORDER BY migration_name
    `;

    expect(migrations.map(({ migration_name: name }) => name)).toEqual(expectedMigrations);
    expect(migrations.every(({ finished_at: finishedAt }) => finishedAt instanceof Date)).toBe(
      true
    );
    expect(migrations.every(({ rolled_back_at: rolledBackAt }) => rolledBackAt === null)).toBe(
      true
    );
  });

  it('persists and retrieves an organization through the generated Prisma client', async () => {
    const marker = randomUUID();
    const slug = `integration-${marker}`;
    organizationSlugs.push(slug);

    const created = await prisma.organization.create({
      data: {
        name: `Integration ${marker}`,
        slug,
        settings: { source: 'integration-test' },
      },
    });
    const retrieved = await prisma.organization.findUnique({ where: { slug } });

    expect(retrieved).toMatchObject({ id: created.id, slug, name: `Integration ${marker}` });
    expect(retrieved.settings).toEqual({ source: 'integration-test' });
  });

  it('round-trips ephemeral cache data through Redis', async () => {
    const key = `serviceflow:integration:${randomUUID()}`;

    await redis.set(key, 'ready', 'EX', 30);
    await expect(redis.get(key)).resolves.toBe('ready');
    await redis.del(key);
    await expect(redis.get(key)).resolves.toBeNull();
  });
});
