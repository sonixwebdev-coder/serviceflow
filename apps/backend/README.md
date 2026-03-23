# ForjaIt Backend API

Express REST API powering the ForjaIt platform. PostgreSQL via Prisma ORM, real-time communication with Socket.io, Redis caching, Stripe billing, and Brevo transactional emails.

## Setup

1. Install workspace dependencies from the monorepo root:
   ```bash
   npm install
   ```

2. Copy the environment template and update secrets:
   ```bash
   cp apps/backend/.env.example apps/backend/.env
   ```

3. Configure the required keys in `apps/backend/.env`:
   ```env
   PORT=5000
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/forjait"
   JWT_ACCESS_SECRET=your_access_secret
   JWT_REFRESH_SECRET=your_refresh_secret

   # Optional: Redis for caching
   REDIS_URL=redis://localhost:6379
   ```

4. (Optional) Install Redis for caching:
   ```bash
   sudo apt install redis-server -y
   ```

5. Generate the Prisma client:
   ```bash
   npm run prisma:generate
   ```

6. Run migrations:
   ```bash
   npm run prisma:migrate
   ```

7. Start the API:
   ```bash
   npm run dev          # Development (auto-starts Redis if available)
   npm run dev:no-redis # Development without Redis
   npm start            # Production
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

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (auto-starts Redis if available) |
| `npm run dev:no-redis` | Dev server without Redis |
| `npm start` | Production server |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:migrate` | Apply dev migrations |
| `npm run prisma:deploy` | Apply migrations in production |
| `npm test` | Run tests with Jest |

## Performance

- Strategic database indexes for optimized queries
- Redis caching (optional): user data (5 min TTL), company settings (30 min TTL), automatic invalidation on updates
- Rate limiting per route with express-rate-limit (Redis-backed when available)
- App works fully without Redis

---

Private — ForjaIt Internal Use Only.
