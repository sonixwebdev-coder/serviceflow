# Deploying ForjaIt on ForjaHost

Instructions for deploying the ForjaIt CRM platform on ForjaHost. ForjaIt is a multi-app monorepo with 5 apps (backend, frontend, admin, client-portal, website), PostgreSQL, Redis, Socket.io, Stripe webhooks, background jobs, file uploads, and persistent storage.

**Target domain**: ForjaIt will use its own custom domain (e.g., `forja.it.com`) with its own Cloudflare Tunnel, completely separate from the ForjaHost tunnel.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Set Up a Separate Cloudflare Tunnel](#2-set-up-a-separate-cloudflare-tunnel)
3. [Deploy the Backend (API)](#3-deploy-the-backend-api)
4. [Deploy the Frontend Apps](#4-deploy-the-frontend-apps)
5. [Database & Redis](#5-database--redis)
6. [Persistent Storage (Uploads & Files)](#6-persistent-storage-uploads--files)
7. [Environment Variables](#7-environment-variables)
8. [Stripe Webhooks](#8-stripe-webhooks)
9. [Background Jobs](#9-background-jobs)
10. [Socket.io / WebSocket](#10-socketio--websocket)
11. [Custom Domain Routing](#11-custom-domain-routing)
12. [Health Checks](#12-health-checks)
13. [Migration Command](#13-migration-command)
14. [Cron Jobs](#14-cron-jobs)
15. [Checklist](#15-checklist)

---

## 1. Architecture Overview

ForjaIt on ForjaHost will be deployed as **5 separate projects**, all pointing to the same GitHub repo but with different build contexts and configurations:

| ForjaHost Project | Build Context | Buildpack | Subdomain |
|---|---|---|---|
| `serviceflow-api` | `.` (root) | `dockerfile` | `api.forja.it.com` |
| `serviceflow-app` | `.` (root) | `dockerfile` | `forja.it.com` |
| `serviceflow-admin` | `.` (root) | `dockerfile` | `admin.forja.it.com` |
| `serviceflow-portal` | `.` (root) | `dockerfile` | `portal.forja.it.com` |
| `serviceflow-website` | `.` (root) | `dockerfile` | `www.forja.it.com` |

Each uses its own Dockerfile (at `apps/{name}/Dockerfile`). The build context is the repo root (`.`) because the Dockerfiles reference root-level `package.json`, `package-lock.json`, and `prisma/` directory.

The backend gets a provisioned PostgreSQL + Redis database from ForjaHost. All frontend apps are stateless nginx containers.

---

## 2. Set Up a Separate Cloudflare Tunnel

ForjaIt needs its **own** Cloudflare Tunnel - not the one ForjaHost uses. This keeps the two platforms fully independent.

### Step 1: Create the tunnel

```bash
cloudflared tunnel create forja-tunnel
```

Note the tunnel ID (e.g., `abc12345-...`).

### Step 2: Route DNS records

```bash
cloudflared tunnel route dns forja-tunnel forja.it.com
cloudflared tunnel route dns forja-tunnel "*.forja.it.com"
```

Or manually in Cloudflare DNS:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `forja.it.com` | `{tunnel-id}.cfargotunnel.com` | Proxied |
| CNAME | `*` | `{tunnel-id}.cfargotunnel.com` | DNS only |

### Step 3: Create the tunnel config

Create a **separate** config file (not the ForjaHost one):

```bash
cat > ~/.cloudflared/serviceflow-config.yml << 'EOF'
tunnel: <SERVICEFLOW_TUNNEL_ID>
credentials-file: /home/<user>/.cloudflared/<SERVICEFLOW_TUNNEL_ID>.json

ingress:
  # API backend (Socket.io needs websocket support)
  - hostname: api.forja.it.com
    service: http://localhost:80
  # Frontend apps
  - hostname: forja.it.com
    service: http://localhost:80
  - hostname: admin.forja.it.com
    service: http://localhost:80
  - hostname: portal.forja.it.com
    service: http://localhost:80
  - hostname: www.forja.it.com
    service: http://localhost:80
  # Catch-all
  - service: http_status:404
EOF
```

All hostnames route to `localhost:80` - that's where Traefik is listening. Traefik then routes to the correct container based on the `Host` header.

### Step 4: Run the ForjaIt tunnel

```bash
cloudflared tunnel --config ~/.cloudflared/serviceflow-config.yml run forja-tunnel
```

To run it in the background:

```bash
nohup cloudflared tunnel --config ~/.cloudflared/serviceflow-config.yml run forja-tunnel > /tmp/serviceflow-tunnel.log 2>&1 &
```

> **Important**: This runs alongside the ForjaHost tunnel. Both tunnels share port 80 (Traefik), which routes based on hostname. Each tunnel just tells Cloudflare which hostnames map to your machine.

---

## 3. Deploy the Backend (API)

### Create the project in ForjaHost

1. Dashboard > New Project
2. **Name**: `serviceflow-api`
3. **GitHub URL**: `https://github.com/<your-username>/serviceflow`
4. **Branch**: `main`
5. **Buildpack**: `dockerfile`
6. **Dockerfile Path**: `apps/backend/Dockerfile`
7. **Build Context**: `.` (repo root - the Dockerfile copies `package.json`, `prisma/`, etc. from root)

### Required changes to the Dockerfile

The current backend Dockerfile (`apps/backend/Dockerfile`) hardcodes `EXPOSE 5000`. ForjaHost injects `PORT=3000`. You need to make the backend respect the `PORT` environment variable.

**Option A - Change the Dockerfile** (recommended):

```dockerfile
FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy root workspace files
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Copy backend package.json
COPY apps/backend/package.json apps/backend/

# Install dependencies
RUN npm ci --workspace apps/backend --include-workspace-root

# Generate Prisma client
RUN npx prisma generate --schema prisma/schema.prisma

# Copy backend source
COPY apps/backend apps/backend/

# Create storage directories
RUN mkdir -p /app/apps/backend/storage /app/apps/backend/uploads

# Non-root user
RUN groupadd -g 1001 appgroup && useradd -u 1001 -g appgroup -s /bin/sh appuser
RUN chown -R appuser:appgroup /app/apps/backend/storage /app/apps/backend/uploads
USER appuser

EXPOSE 3000

CMD ["node", "apps/backend/server.js"]
```

**Option B - Use ForjaHost start command**:

Keep the Dockerfile as-is, but set the **Start Command** in ForjaHost project settings:

```
PORT=3000 node apps/backend/server.js
```

The backend already reads `process.env.PORT || 5000` (line 325 of `server.js`), so just setting `PORT=3000` via environment variable is enough.

### Health Check

Set in ForjaHost project settings:
- **Type**: `http`
- **Path**: `/health`
- **Expected Status**: `200`

---

## 4. Deploy the Frontend Apps

Each frontend app builds to a static nginx container. Create 4 ForjaHost projects:

### serviceflow-app (main frontend)

| Setting | Value                                            |
|---------|--------------------------------------------------|
| Name | `serviceflow-app`                                |
| GitHub URL | Same repo                                        |
| Buildpack | `dockerfile`                                     |
| Dockerfile Path | `apps/frontend/Dockerfile`                       |
| Build Context | `.` (root - Dockerfile copies root package.json) |
| Health Check | `http`, path `/`, status `200`                   |
| Domain | `forja.it.com`                                   |

### serviceflow-admin

| Setting | Value |
|---------|-------|
| Name | `serviceflow-admin` |
| Dockerfile Path | `apps/admin/Dockerfile` |
| Build Context | `.` |
| Domain | `admin.forja.it.com` |

### serviceflow-portal

| Setting | Value |
|---------|-------|
| Name | `serviceflow-portal` |
| Dockerfile Path | `apps/client-portal/Dockerfile` |
| Build Context | `.` |
| Domain | `portal.forja.it.com` |

### serviceflow-website

| Setting | Value |
|---------|-------|
| Name | `serviceflow-website` |
| Dockerfile Path | `apps/website/Dockerfile` |
| Build Context | `.` |
| Domain | `www.forja.it.com` |

> **Note**: The frontend Dockerfiles all reference `apps/frontend/nginx.conf` for the nginx config. This is shared across all SPAs - SPA routing (try_files), caching for `/assets`, and security headers.

### Required changes to frontend apps

Each frontend app needs the API URL configured at build time. Set these as environment variables in each ForjaHost project:

**serviceflow-app**:
```
VITE_API_URL=https://api.forja.it.com
VITE_WS_URL=wss://api.forja.it.com
```

**serviceflow-admin**:
```
VITE_API_URL=https://api.forja.it.com
```

**serviceflow-portal**:
```
VITE_API_URL=https://api.forja.it.com
VITE_WS_URL=wss://api.forja.it.com
```

> **Important**: Vite `VITE_*` env vars are embedded at build time, not runtime. They must be set as environment variables in ForjaHost **before** deploying. Changes require a redeploy.

---

## 5. Database & Redis

### Provision via ForjaHost

1. Go to `serviceflow-api` project > Databases tab
2. **Provision PostgreSQL** (version 16)
   - ForjaHost auto-injects `DATABASE_URL` into the backend's environment
3. **Provision Redis** (version 7)
   - ForjaHost auto-injects `REDIS_URL` into the backend's environment

These run on the project's private Docker network (`fh-net-serviceflow-api-production`). The backend container can reach them by hostname.

### Migrations

Set the **Migration Command** in the `serviceflow-api` project settings:

```
npx prisma migrate deploy --schema prisma/schema.prisma
```

This runs inside the container after every deploy, before routing traffic. It applies any pending database migrations.

### Seeding

For the first deploy, you'll need to seed initial data. Run this once via the ForjaHost terminal (Project > Terminal tab):

```bash
node prisma/seed.js
```

---

## 6. Persistent Storage (Uploads & Files)

ForjaIt stores files in two directories. **Both must persist across deploys.**

| Directory (in container) | Contents                                                                                                                                                                                                                                       |
|---|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `/app/apps/backend/storage` | Chat attachments (`storage/chat/{orgId}/{channelId}/files/`), voice messages (`storage/chat/{orgId}/{channelId}/voice/`), organization logos (`storage/logos/`), website images (`storage/website-images/{orgId}/`), generated invoices (PDFs) |
| `/app/apps/backend/uploads` | Appointment message files and voice messages (`uploads/messages/`) - from both CRM and client portal routes                                                                                                                                    |

Create two **Storage Volumes** in the `serviceflow-api` project:

| Volume Name | Mount Path | Size Limit |
|---|---|---|
| `storage` | `/app/apps/backend/storage` | 5000 MB |
| `uploads` | `/app/apps/backend/uploads` | 5000 MB |

The backend serves these via:
- `GET /files/*` → maps to `storage/` directory (auth-protected, except `/files/logos/` and `/files/websites/`)
- `GET /uploads/*` → maps to `uploads/` directory (auth-protected)

> **Note**: Chat file uploads use `multer.memoryStorage()` and are then written to disk via `writeFile()` into the `storage/` directory. Appointment files use `multer.diskStorage` directly into `uploads/messages/`. Client CSV imports are memory-only (no disk persistence).

---

## 7. Environment Variables

Set these in the `serviceflow-api` project (Environment Variables tab, Production environment):

### Required

```env
NODE_ENV=production
PORT=3000

# Database - auto-injected by ForjaHost when you provision PostgreSQL
# DATABASE_URL=... (auto-set)

# Redis - auto-injected by ForjaHost when you provision Redis
# REDIS_URL=... (auto-set)

# Auth secrets (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=<64-char-hex>
JWT_REFRESH_SECRET=<64-char-hex>
CSRF_SECRET=<64-char-hex>

# CORS - all frontend origins that can call the API
CORS_ORIGINS=https://forja.it.com,https://portal.forja.it.com,https://admin.forja.it.com

# Frontend URLs (for email links, redirects, etc.)
FRONTEND_URL=https://forja.it.com
CLIENT_PORTAL_URL=https://portal.forja.it.com
ADMIN_URL=https://admin.forja.it.com
WEBSITE_URL=https://www.forja.it.com

# File storage root (matches the storage volume mount path)
FILE_STORAGE_ROOT=/app/apps/backend/storage
```

### Stripe (mark as Secret)

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Email / Brevo (mark as Secret)

```env
BREVO_API_KEY=xkeysib-...
BREVO_SENDER_EMAIL=noreply@forja.it.com
BREVO_SENDER_NAME=ForjaIt
```

### Optional

```env
# Sentry error tracking
SENTRY_DSN=https://...@sentry.io/...

# ANAF integration (Romanian e-invoice, disabled by default)
# ANAF_ENABLE_AUTO_SUBMIT=true

# Web push notifications
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:admin@forja.it.com

# Super admin email (for platform-level admin access)
SUPER_ADMIN_EMAIL=your-email@example.com
```

---

## 8. Stripe Webhooks

Stripe needs to send webhook events to your API. After deploying:

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://api.forja.it.com/api/webhooks/stripe`
3. Select events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`
4. Copy the **Webhook Signing Secret** (`whsec_...`)
5. Set it as `STRIPE_WEBHOOK_SECRET` in ForjaHost env vars (mark as Secret)

> **Important**: The Stripe webhook route is mounted before `express.json()` in server.js (it needs the raw body for signature verification). This works out of the box - no changes needed.

---

## 9. Background Jobs

ForjaIt has built-in background jobs that start automatically when the server boots (via `initializeJobs()` in `server.js`):

| Job | Purpose | Runs |
|-----|---------|------|
| Cleanup | Stale data cleanup, old chat messages, expired tokens | Periodically (setInterval) |
| Notifications | Invoice overdue warnings, appointment reminders | Periodically |
| Subscriptions | Trial expiry alerts, renewal reminders | Periodically |

These run inside the backend container as `setInterval` timers - no external cron needed. They start on server boot and stop on graceful shutdown.

If you need additional scheduled tasks, use ForjaHost's cron jobs feature (Project > Cron Jobs tab).

---

## 10. Socket.io / WebSocket

ForjaIt uses Socket.io for real-time features (chat typing indicators, presence, notifications). The Socket.io server runs on the same port as the HTTP server.

### Cloudflare Tunnel WebSocket support

Cloudflare Tunnel supports WebSocket connections natively - no additional configuration needed. Socket.io will use WebSocket transport through the tunnel.

### CORS configuration

The backend's Socket.io CORS (in `src/realtime/index.js`) reads from `FRONTEND_URL` and `CLIENT_PORTAL_URL` env vars. Make sure these are set correctly:

```env
FRONTEND_URL=https://forja.it.com
CLIENT_PORTAL_URL=https://portal.forja.it.com
```

### Frontend Socket.io connection

The frontend apps connect to the API's Socket.io server. Make sure the connection URL points to the API domain:

```javascript
// In frontend code
const socket = io('https://api.forja.it.com', {
  auth: { token: accessToken },
  transports: ['websocket', 'polling'],
});
```

---

## 11. Custom Domain Routing

After creating all 5 ForjaHost projects, add custom domains to each:

1. `serviceflow-api` → `api.forja.it.com`
2. `serviceflow-app` → `forja.it.com`
3. `serviceflow-admin` → `admin.forja.it.com`
4. `serviceflow-portal` → `portal.forja.it.com`
5. `serviceflow-website` → `www.forja.it.com`

Go to each project > Domains tab > Add Domain. ForjaHost will configure Traefik routing automatically based on the hostname.

---

## 12. Health Checks

| Project | Type | Path | Expected |
|---------|------|------|----------|
| serviceflow-api | `http` | `/health` | 200 |
| serviceflow-app | `http` | `/` | 200 |
| serviceflow-admin | `http` | `/` | 200 |
| serviceflow-portal | `http` | `/` | 200 |
| serviceflow-website | `http` | `/` | 200 |

The frontend apps (nginx) return 200 for `/` by default. The API has an explicit `/health` endpoint.

---

## 13. Migration Command

Set on the `serviceflow-api` project only:

```
npx prisma migrate deploy --schema prisma/schema.prisma
```

Frontend projects don't need a migration command.

---

## 14. Cron Jobs

If you need scheduled tasks beyond the built-in background jobs, create them via ForjaHost:

| Name | Schedule | Command | Purpose |
|------|----------|---------|---------|
| DB Cleanup | `0 3 * * *` | `node -e "require('./src/jobs/cleanupJob').runOnce()"` | Daily cleanup at 3am |

This is optional - the built-in `setInterval` jobs handle most tasks. Use ForjaHost cron jobs for tasks you want visibility into (dashboard shows run history, exit codes, output).

---

## 15. Checklist

### Before first deploy

- [ ] Create the ForjaIt Cloudflare Tunnel (separate from ForjaHost)
- [ ] Configure DNS records for all 5 subdomains
- [ ] Start the ForjaIt tunnel process

### ForjaHost projects

- [ ] Create `serviceflow-api` project (dockerfile buildpack, `apps/backend/Dockerfile`)
- [ ] Create `serviceflow-app` project (dockerfile buildpack, `apps/frontend/Dockerfile`)
- [ ] Create `serviceflow-admin` project (dockerfile buildpack, `apps/admin/Dockerfile`)
- [ ] Create `serviceflow-portal` project (dockerfile buildpack, `apps/client-portal/Dockerfile`)
- [ ] Create `serviceflow-website` project (dockerfile buildpack, `apps/website/Dockerfile`)

### Backend infrastructure

- [ ] Provision PostgreSQL database for `serviceflow-api`
- [ ] Provision Redis for `serviceflow-api`
- [ ] Create storage volume: `storage` → `/app/apps/backend/storage`
- [ ] Create storage volume: `uploads` → `/app/apps/backend/uploads`
- [ ] Set migration command: `npx prisma migrate deploy --schema prisma/schema.prisma`

### Environment variables

- [ ] Set all required env vars on `serviceflow-api` (JWT secrets, CORS origins, URLs)
- [ ] Set Stripe keys (mark as Secret)
- [ ] Set Brevo API key (mark as Secret)
- [ ] Set `VITE_API_URL` and `VITE_WS_URL` on each frontend project

### Domains

- [ ] Add `api.forja.it.com` to `serviceflow-api`
- [ ] Add `forja.it.com` to `serviceflow-app`
- [ ] Add `admin.forja.it.com` to `serviceflow-admin`
- [ ] Add `portal.forja.it.com` to `serviceflow-portal`
- [ ] Add `www.forja.it.com` to `serviceflow-website`

### Health checks

- [ ] Set `/health` on `serviceflow-api`
- [ ] Set `/` on all frontend projects

### Post-deploy

- [ ] Run database seed via terminal: `node prisma/seed.js`
- [ ] Configure Stripe webhook endpoint: `https://api.forja.it.com/api/webhooks/stripe`
- [ ] Test login flow
- [ ] Test Socket.io connection (chat, typing indicators)
- [ ] Test file upload and download
- [ ] Verify Stripe webhook delivery

### GitHub auto-deploy

- [ ] Add webhook on the ForjaIt GitHub repo
- [ ] Payload URL: `https://<forjahost-domain>/api/github/webhook`
- [ ] Events: Push (triggers deploy of all 5 projects on push to main)

---

## Code Changes Needed in ForjaIt

These are the minimal changes required in the ForjaIt codebase to be ForjaHost-compatible:

### 1. Backend must listen on PORT env var

Already done - `server.js` line 325: `const PORT = process.env.PORT || 5000;`

Just set `PORT=3000` in ForjaHost env vars (ForjaHost injects this automatically).

### 2. File storage path must be configurable

Already done - `server.js` line 51: `const fileStorageRoot = process.env.FILE_STORAGE_ROOT || path.resolve(__dirname, 'storage');`

Set `FILE_STORAGE_ROOT=/app/apps/backend/storage` in env vars.

### 3. CORS origins must be configurable

Already done - `server.js` line 56: reads from `process.env.CORS_ORIGINS`.

### 4. Frontend API URLs must use env vars

Already done if using `VITE_API_URL` in the frontend code. Verify the frontend apps read the API URL from an env var, not a hardcoded string.

### 5. No other changes needed

ForjaIt is already well-structured for containerized deployment. The existing Dockerfiles, health endpoint, configurable env vars, and graceful shutdown all work as-is with ForjaHost.
