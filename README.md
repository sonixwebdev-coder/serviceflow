# ServiceFlow CRM

ServiceFlow is a modern CRM platform designed for Romanian service businesses. Built with a clean architecture, it provides appointment scheduling, client management, invoicing with ANAF integration, and team management tools.

## 📦 Project Layout

```
apps/
  frontend/   # React + Vite SPA
  backend/    # Express API (migrating to PostgreSQL/Prisma)
docs/         # Architecture & product notes
scripts/      # Local orchestration utilities
```

## 🚀 Quick Start

```bash
# Install workspace dependencies
npm install

# Copy environment defaults
cp apps/frontend/.env.example apps/frontend/.env
cp apps/backend/.env.example apps/backend/.env   # (to be added with Prisma migration)

# Launch frontend + backend together
npm run dev
```

### Target Stack (per CRM integration plan)

- **Frontend:** React 19, Vite, Tailwind CSS, Radix UI, Zustand, React Query, Socket.io client
- **Backend:** Node.js 22, Express 5, PostgreSQL, Prisma ORM, Socket.io server
- **Auth:** JWT access + refresh tokens, argon2/bcrypt password hashing, RBAC via roles & permissions tables
- **PDF & Messaging:** Puppeteer/pdf-lib for service orders, realtime messaging with audit trail

## 🔧 Workspace Scripts

- `npm run dev` – start backend and frontend together via `scripts/start-all.js`
- `npm run dev:frontend` – run the frontend only
- `npm run dev:backend` – run the backend only
- `npm run build` – build the frontend SPA
- `npm run lint` – lint the frontend
- `npm run create-admin` – invoke backend admin seeding script

### Frontend Scripts (`apps/frontend`)

- `npm run dev`, `build`, `preview`, `lint`, `test`

### Backend Scripts (`apps/backend`)

- `npm run dev`, `start`, `create-admin`

## 📚 Documentation

- `docs/viper_x_crm_integrated_documentation.md` – consolidated CRM + Team Manager requirements and architecture blueprint.

## 🗺️ Next Steps

1. Introduce Prisma + PostgreSQL configuration inside `apps/backend`.
2. Port existing Mongo-backed modules to Prisma models.
3. Layer in CRM features (appointments, clients, messaging, PDFs, audit logs).
4. Add realtime messaging and notification channels with Socket.io.
5. Update frontend state management and routes to match CRM modules.

## 📋 Product Vision

ServiceFlow aims to become the go-to CRM for Romanian service businesses (auto repair, HVAC, appliance repair, IT support) with:

- Multi-tenant SaaS architecture
- ANAF e-factura integration
- White-label capabilities for enterprise clients
- Romanian language support and compliance

For more details, see `docs/STRATEGIC_PLAN.md`.
