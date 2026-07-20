# Docker deployment

The supplied production Compose file builds one API image and four nginx images. It also runs PostgreSQL 16 and Redis 7 with persistent volumes.

## Prepare configuration

1. Copy `.env.example` to `.env` on the deployment host.
2. Replace every signing, encryption, database, provider, and webhook secret.
3. Set public application URLs and `CORS_ORIGINS` to HTTPS origins.
4. Set platform identity and runtime application URLs.
5. Choose either `WEBSITE_BASE_URL` or `WEBSITE_URL_TEMPLATE`.
6. Configure TLS and request-size limits at the external reverse proxy.

Validate without starting services:

```bash
docker compose -f docker-compose.prod.yml config --quiet
```

## Start or upgrade

Back up PostgreSQL and uploaded files before every upgrade. Then:

```bash
docker compose -f docker-compose.prod.yml build --pull
docker compose -f docker-compose.prod.yml run --rm backend \
  npx prisma migrate deploy --schema /app/prisma/schema.prisma
docker compose -f docker-compose.prod.yml up -d
```

Inspect service health and logs after startup. The API container drops privileges after preparing persistent-directory permissions; static apps run with the nginx image defaults. Do not expose PostgreSQL or Redis publicly.

## Reverse proxy

Route each configured public hostname to its application container and route the API/Socket.IO hostname to the backend. Preserve WebSocket upgrade headers, forward the client address through one trusted proxy hop, enforce HTTPS, and set upload/body limits appropriate to configured application limits.

## Persistence

Back up `pgdata` and `backend_storage`. Redis data improves continuity but PostgreSQL and uploaded files are the authoritative recovery set. See [backup-restore.md](backup-restore.md).

## Production checklist

- Unique high-entropy secrets and least-privilege provider credentials
- HTTPS on every public origin
- Restricted network access to database, Redis, and administration endpoints
- Tested backups and restore procedure
- Log rotation, monitoring, time synchronization, and resource limits
- Current privacy/legal/operator information and data-retention configuration
- Successful `npm run check`, container builds, migration validation, and smoke tests for the release commit
