# ForjaIt

ForjaIt is a multi-tenant SaaS platform for managing service businesses. It provides CRM, appointment scheduling, invoicing, team management, a website builder, a client portal, a loyalty program, and real-time chat - all in one place. Built for the Romanian market with GDPR compliance, Romanian language UI, and ANPC/SAL/SOL integration.

## Project Layout

```
apps/
  frontend/       # Admin dashboard - React + Vite SPA (port 5173)
  backend/        # REST API - Express + PostgreSQL/Prisma + Socket.io (port 5000)
  website/        # Public website renderer for orgs - React + Vite (port 5175)
  client-portal/  # Client-facing portal - React + Vite (port 5174)
  admin/          # Platform super-admin panel - React + Vite (port 5176)
prisma/           # Shared Prisma schema & migrations
scripts/          # Local orchestration (start-all.js)
docs/             # Deployment & product notes
```

## Quick Start

```bash
# Install workspace dependencies
npm install

# Copy environment defaults
cp apps/frontend/.env.example apps/frontend/.env
cp apps/backend/.env.example apps/backend/.env

# Run database migrations
cd apps/backend && npm run prisma:migrate

# Launch frontend + backend together
npm run dev
```

## Tech Stack

- **Frontend apps:** React 19, Vite 7, Tailwind CSS 3, TanStack Query, React Hook Form, Zod, Zustand, Recharts, Lucide icons, Socket.io client, dnd-kit
- **Backend:** Node.js, Express 4, PostgreSQL, Prisma ORM, Socket.io, Redis (optional caching)
- **Auth:** JWT access + refresh tokens, bcrypt password hashing, CSRF protection, optional 2FA (TOTP), role-based access control (RBAC)
- **Payments:** Stripe integration for subscription billing
- **Email:** Brevo (Sendinblue) transactional emails via Handlebars templates
- **PDF:** pdf-lib for service orders and invoices
- **Push notifications:** Web Push (VAPID)
- **Scheduled jobs:** node-cron for background tasks

## Features

### Admin Dashboard (`apps/frontend`)
- Client management (CRM) with search, filters, and import/export
- Appointment scheduling with calendar view
- Invoice generation and tracking
- Team management: employees, leave requests, time tracking, tasks
- Real-time chat with channels and direct messages
- Website builder with drag-and-drop blocks
- Website leads management
- Multi-location support
- Loyalty program management
- Analytics and activity timeline
- Company and organization settings
- Email template customization
- Billing and subscription management
- Support ticket system
- Onboarding wizard for new organizations
- Personal to-do list

### Website Builder (`apps/website`)
Org-specific public websites rendered by subdomain with 18 block types: Hero, Text, Image, Button, Video, Gallery, Services Grid, Pricing Table, Testimonials, FAQ, Contact Form, Booking Widget, Stats, Team Grid, Locations Map, Divider, Spacer.

### Client Portal (`apps/client-portal`)
Clients can view and book appointments, access invoices, check loyalty points, browse a marketplace of organizations, contact their service provider, and manage their profile.

### Super Admin (`apps/admin`)
Platform-level management: organizations, billing, support tickets, contact messages, system logs, maintenance mode, and platform settings.

### Backend API (`apps/backend`)
36 API route modules covering auth, appointments, clients, assets, invoices, chat, loyalty, billing, notifications, analytics, exports, webhooks, integrations, and more.

## Workspace Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend + frontend together |
| `npm run dev:frontend` | Frontend only |
| `npm run dev:backend` | Backend only |
| `npm run dev:portal` | Client portal only |
| `npm run build` | Build the admin frontend |
| `npm run build:portal` | Build the client portal |
| `npm run lint` | Lint the admin frontend |
| `npm run db:seed` | Seed the database |

### Backend Scripts (`apps/backend`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server (auto-starts Redis if available) |
| `npm run dev:no-redis` | Dev server without Redis |
| `npm start` | Production server |
| `npm run prisma:generate` | Regenerate Prisma client |
| `npm run prisma:migrate` | Run dev migrations |
| `npm run prisma:deploy` | Apply migrations in production |
| `npm test` | Run tests with Jest |

## Environment

The backend requires these environment variables (see `.env.example`):

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` - JWT signing keys
- `REDIS_URL` - (optional) Redis for caching
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` - Stripe billing
- `BREVO_API_KEY` - Transactional email
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` - Web push notifications

## Compliance

- GDPR compliant (data processing, retention periods, right to deletion)
- Romanian data retention per Law 82/1991 (modified by Law 36/2023): 5 years for accounting documents, 10 years for financial statements
- Cookie consent per Law 506/2004 (ePrivacy)
- ANPC, SAL, and SOL links on all public pages

---

Private - ForjaIt Internal Use Only.
