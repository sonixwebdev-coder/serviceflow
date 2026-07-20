# ServiceFlow Backend API

Express REST API powering the ServiceFlow platform. PostgreSQL via Prisma ORM, real-time communication with Socket.io, Redis caching, Stripe billing, and Brevo transactional emails.

## Setup

1. Install workspace dependencies from the monorepo root:

   ```bash
   npm ci
   ```

2. Copy the environment template and update secrets:

   ```bash
   cp .env.example .env
   ```

3. Configure the required keys in the root `.env`:

   ```env
   PORT=5000
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/serviceflow"
   JWT_ACCESS_SECRET=your_access_secret
   JWT_REFRESH_SECRET=your_refresh_secret

   # Required in production; reduced local operation is possible without it
   REDIS_URL=redis://localhost:6379
   ```

4. Start the local PostgreSQL and Redis services:

   ```bash
   docker compose up -d postgres redis
   ```

5. Generate the Prisma client:

   ```bash
   npm run prisma:generate --workspace apps/backend
   ```

6. Run migrations:

   ```bash
   npm run prisma:migrate --workspace apps/backend
   ```

7. Start the API:
   ```bash
   npm run dev:backend                                     # Development
   npm run dev:no-redis --workspace apps/backend           # Reduced local mode
   npm start --workspace apps/backend                      # Production
   ```

## Directory Structure

```
apps/backend/
├── src/
│   ├── api/          # 36 Express route modules
│   ├── services/     # Business logic layer
│   ├── middleware/    # Auth, RBAC, validation, rate limiting
│   ├── schemas/      # Zod validation schemas
│   ├── realtime/     # Socket.io event handlers
│   ├── jobs/         # Scheduled cron jobs
│   ├── templates/    # Handlebars email templates
│   ├── scripts/      # CLI utilities
│   ├── lib/          # Prisma client singleton
│   ├── constants/    # Shared constants
│   └── utils/        # Helpers
├── assets/           # Fonts and static files for PDF generation
├── server.js         # Express bootstrap & Prisma connection
├── Dockerfile        # Production container
└── dev-start.sh      # Dev startup script
```

## API Modules

auth, users, organizations, clients, appointments, assets, resources, invoices, payments, billing, chat, notifications, push notifications, loyalty, tasks, personal todos, leave requests, time tracking, analytics, audit logs, search, exports, email templates, settings, locations, services, website, contact, integrations, webhooks, pricing, support, super admin, two-factor auth.

## Scripts

| Command                                            | Description                                 |
| -------------------------------------------------- | ------------------------------------------- |
| `npm run dev:backend`                              | Dev server (auto-starts Redis if available) |
| `npm run dev:no-redis --workspace apps/backend`    | Dev server without Redis                    |
| `npm start --workspace apps/backend`               | Production server                           |
| `npm run prisma:generate --workspace apps/backend` | Regenerate Prisma client                    |
| `npm run prisma:migrate --workspace apps/backend`  | Apply development migrations                |
| `npm run prisma:deploy --workspace apps/backend`   | Apply production migrations                 |
| `npm test --workspace apps/backend`                | Run tests with Jest                         |

## Performance

- Strategic database indexes for optimized queries
- Redis caching: user data (5 min TTL), company settings (30 min TTL), automatic invalidation on updates
- Rate limiting per route with express-rate-limit (Redis-backed when available)
- Local development can run with reduced behavior when Redis is unavailable. Production
  deployments should treat Redis as required for distributed rate limiting, caching, presence, and
  realtime consistency.

For repository-wide development, deployment, and configuration guidance, see the
[root documentation](../../README.md). This application is licensed with the rest of ServiceFlow
under AGPL-3.0-only.
