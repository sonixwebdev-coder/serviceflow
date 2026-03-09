# ForjaHost — Enhanced Platform Specification

A self-hosted PaaS for deploying, managing, and scaling web projects on bare-metal or VPS infrastructure. No cloud vendor dependency. Single admin operator with API key support for CI/CD automation.

---

## 1. Goals

- Deploy any project from a GitHub repo with zero manual SSH
- Manage multiple projects, each with dev + prod environments
- Automatic SSL via Let's Encrypt
- Built-in Postgres, Redis, and file storage per project
- Single admin dashboard to manage everything
- Run on a single server initially, scale to multi-node later
- Security-first design: Docker socket proxy, 2FA, audit logging, encrypted secrets, network isolation
- Reliability-first design: deploy locking, build queue, automatic cleanup, health monitoring
- CI/CD integration via scoped, rotatable API keys
- Dashboard-only notifications (no email/webhook — in-app alerts and activity feed)
- Web terminal for container shell access
- Monorepo support with custom build contexts

---

## 2. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            Host Machine                                  │
│                                                                          │
│  ┌──────────────────┐    ┌────────────────────────────────────────────┐  │
│  │  ForjaHost        │    │            Traefik v3                      │  │
│  │  Dashboard (React) │    │  - Auto SSL (Let's Encrypt)               │  │
│  │  served by API     │    │  - Route *.domain → containers            │  │
│  └────────┬─────────┘    │  - Security headers middleware             │  │
│           │               └──────────────┬───────────────────────────┘  │
│  ┌────────┴─────────┐                   │                               │
│  │  ForjaHost API    │                   │   Connects via               │
│  │  (Node.js)        │                   │   docker-socket-proxy        │
│  │                   │                   │   (read-only for Traefik)    │
│  │  - Projects       │                   │                               │
│  │  - Deploys        │    ┌──────────────┴───────────────────────────┐  │
│  │  - Build Queue    │    │   Docker Socket Proxy                     │  │
│  │  - Domains        │    │   (tecnativa/docker-socket-proxy)         │  │
│  │  - Databases      │    │   - Traefik: read-only (containers,       │  │
│  │  - Storage        │    │     networks, tasks, services)            │  │
│  │  - GitHub         │    │   - API: full access via separate         │  │
│  │  - Audit Log      │    │     proxy instance                        │  │
│  │  - Alert Engine   │    └──────────────┬───────────────────────────┘  │
│  │  - Cron Manager   │                   │                               │
│  │  - Terminal (WS)  │    ┌──────────────┴───────────────────────────┐  │
│  └────────┬─────────┘    │          Docker Engine                     │  │
│           │               │                                            │  │
│  ┌────────┴─────────┐    │  ┌──────────┐  ┌──────────┐               │  │
│  │  Build Queue      │    │  │ proj-A   │  │ proj-B   │  ...          │  │
│  │  Worker           │    │  │ (prod)   │  │ (dev)    │               │  │
│  │  - MAX_CONCURRENT │    │  │ net:     │  │ net:     │               │  │
│  │    _BUILDS: 2     │    │  │ fh-net-  │  │ fh-net-  │               │  │
│  │  - Priority:      │    │  │ proj-a + │  │ proj-b + │               │  │
│  │    manual > hook  │    │  │ traefik- │  │ traefik- │               │  │
│  └──────────────────┘    │  │ public   │  │ public   │               │  │
│                           │  └──────────┘  └──────────┘               │  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Shared Infrastructure                          │  │
│  │  - Platform PostgreSQL (ForjaHost's own DB)                       │  │
│  │  - Platform Redis (cache, rate limits, token blacklist, queues)    │  │
│  │  - Build cache volume (BuildKit layer cache)                      │  │
│  │  - Backup cron → encrypted local or remote                       │  │
│  │  - Backup verification loop (weekly test restore)                 │  │
│  │  - Orphan reconciliation job (hourly)                             │  │
│  │  - Disk space GC (nightly prune, weekly BuildKit prune)           │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

**Key architectural decisions:**
- Docker socket is NEVER directly exposed to Traefik or the API. A `docker-socket-proxy` sits between them.
- Traefik gets a read-only proxy (only `CONTAINERS`, `NETWORKS`, `SERVICES`, `TASKS` enabled).
- The API server gets a separate proxy instance with broader permissions (containers, images, networks, volumes, build, exec).
- Each project's containers join their own private Docker network + `traefik-public`. No cross-project communication is possible.
- Platform Redis handles caching, rate limiting, token blacklisting, and build queue coordination.

---

## 3. Core Modules

### 3.1 Project Manager

A "project" = one GitHub repo with one or more environments.

**Operations:**
- Create project → clone repo, detect build method, provision resources
- Deploy → build image, swap containers with zero-downtime
- Rollback → re-deploy previous image tag
- Delete → tear down containers, optionally delete data
- View logs → stream container stdout/stderr
- Exec → open shell session via web terminal (audit logged)
- Drain → stop accepting new deploys, finish in-progress ones

**Monorepo support:**
- `buildContext` — subdirectory within the repo to use as Docker build context (default: `.`)
- `dockerfilePath` — path to Dockerfile relative to repo root (default: `Dockerfile`)
- `buildArgs` — JSON object of build-time arguments passed to `docker build --build-arg`
- Example: repo `myorg/monorepo`, project uses `buildContext: "apps/api"`, `dockerfilePath: "apps/api/Dockerfile"`

### 3.2 Build System

Turns a Git repo into a Docker image.

**Build pipeline:**
1. Check deploy lock — if another deploy is running for this project+env, queue this one
2. Acquire deploy lock
3. Clone repo (specific branch + commit) — `.git` directory is excluded from build context
4. Detect build strategy:
   - `Dockerfile` present at `dockerfilePath` → use it
   - `package.json` → Node buildpack (detect Vite/Next/Express)
   - `requirements.txt` → Python buildpack
   - Static files → nginx container
5. Build image with Docker BuildKit (layer caching via persistent volume)
   - Secrets passed via `--secret` (never as build args for sensitive data)
   - Network access during build configurable: `buildNetworkMode: "default" | "none" | "host"`
6. Tag image: `forjahost/{project_slug}:{env}-{commit_sha_short}`
7. Store build log, duration, status
8. Release deploy lock

**Build strategies:**
- `dockerfile` — use project's own Dockerfile
- `node-static` — npm ci → npm run build → nginx (SPAs)
- `node-server` — npm ci → node server.js (APIs)
- `static` — copy files into nginx

**Build cache:**
- Mount a persistent Docker volume for npm/node_modules cache
- Each project gets its own cache namespace
- Periodic cleanup of old caches (>7 days unused)

**Build log management:**
- Build logs stored in `deploys.build_log` column up to 5MB
- Logs exceeding 5MB are truncated in DB, full log written to filesystem at `/var/forjahost/logs/builds/{deployId}.log`
- `Deploy.buildLogPath` stores the filesystem path when overflow occurs
- Filesystem logs compressed after 7 days, deleted after 90 days

**Build-time security:**
- `.git` directory stripped from build context (prepend `.git` to any existing `.dockerignore`, or create one)
- BuildKit `--secret` used for credentials needed at build time (never `--build-arg` for sensitive values)
- Build network mode configurable per project (`none` for maximum isolation)
- Build timeout: 15 minutes default, configurable per project (`buildTimeoutSec`)

### 3.3 Deploy Engine

Manages running containers for each project environment.

**Deploy flow (zero-downtime):**
1. Acquire deploy lock for project+env (or queue if locked)
2. Build image (see 3.2)
3. Start new container from built image on project's private network + `traefik-public`
4. If `migrationCommand` is set: exec the command inside the new container, fail deploy if exit code != 0
5. Health check (configurable: HTTP method, path, expected status, timeout, interval)
6. If healthy: update Traefik routing (drain old routes first) → wait `stopGracePeriodSec` → stop old container
7. If unhealthy after timeout: remove new container, keep old, mark deploy as failed
8. Release deploy lock
9. Clean up old images (keep last 5 per project/env)

**Container management:**
- Each project+env gets a dedicated Docker network (`fh-net-{slug}-{env}`)
- Containers connect to their database/redis on the same network
- Resource limits per container (CPU, memory) — configurable per project
- Auto-restart on crash (Docker restart policy: `unless-stopped`)
- Containers also join `traefik-public` network for reverse proxy routing
- No cross-project network communication (network isolation)

**Naming convention:**
```
Container:  fh-{project_slug}-{env}          e.g. fh-serviceflow-prod
Network:    fh-net-{project_slug}-{env}
Image:      forjahost/{project_slug}:{env}-{sha}
```

**Graceful shutdown:**
- Before stopping old container: remove Traefik labels (drain routes), wait for in-flight requests to complete
- Configurable `stopGracePeriodSec` per project (default: 30, max: 120)
- Docker stop with `--time={stopGracePeriodSec}` sends SIGTERM, then SIGKILL after timeout

### 3.4 Reverse Proxy & Domain Manager

Traefik v3 with Docker provider, accessed through docker-socket-proxy (read-only).

**Why Traefik:**
- Watches Docker labels → auto-configures routes
- Built-in Let's Encrypt with auto-renewal
- Middleware: rate limiting, security headers, redirects
- Crash recovery: `restart: always`, `acme.json` on a named Docker volume

**How it works:**
- When a domain is added, the API writes Docker labels to the project container
- Traefik picks up labels and provisions SSL automatically
- For dev environments: use wildcard subdomain `{project}-dev.yourdomain.com`
- SSL certificate expiry tracked in `domains.ssl_expires_at` (parsed from acme.json)

**Docker labels set per container:**
```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.{name}.rule=Host(`app.example.com`)"
  - "traefik.http.routers.{name}.tls.certresolver=letsencrypt"
  - "traefik.http.routers.{name}.middlewares=security-headers@file"
  - "traefik.http.services.{name}.loadbalancer.server.port=3000"
  - "traefik.docker.network=traefik-public"
```

### 3.5 Database Manager

Each project can provision Postgres and/or Redis instances.

**Implementation:**
- Postgres: run `postgres:16` container on project's Docker network
- Redis: run `redis:7-alpine` container
- Credentials auto-generated, injected as env vars into project container
- Connection string uses Docker network DNS (no port exposure to host)

**Backups:**
- Cron job runs `pg_dump` per database
- Store compressed + encrypted backups in `/var/forjahost/backups/{project}/{date}.sql.gz.enc`
- Retention: 7 daily + 4 weekly + 3 monthly
- Manual backup trigger from dashboard
- One-click restore from any backup
- Backup encryption: AES-256-GCM with `BACKUP_ENCRYPTION_KEY` (separate from secrets encryption key)
- Backup verification: weekly automated test restore to a temporary container, checksum comparison
- Verification status tracked per backup record

### 3.6 File Storage Manager

Persistent volumes for user uploads, generated files, etc.

**Implementation:**
- Docker bind mounts from host filesystem
- Host path: `/var/forjahost/storage/{project_slug}/{env}/{volume_name}`
- Included in backup rotation
- Dashboard shows usage per volume
- `currentSizeMb` tracked via periodic `du` check (every 10 minutes)

### 3.7 GitHub Integration

**Webhook-based deploys:**
1. User connects GitHub repo (personal access token stored encrypted)
2. Platform registers a webhook on the repo with a unique secret per project
3. On push to configured branch → verify `X-Hub-Signature-256` (HMAC-SHA256) → trigger build + deploy
4. Deploy status reported back as GitHub commit status check

**Webhook signature verification:**
```javascript
const crypto = require('crypto');
const verifyWebhookSignature = (payload, signature, secret) => {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};
```

**Important:** Raw body must be preserved before JSON middleware — webhook route is mounted before `express.json()`.

**Manual deploys:**
- Pick any branch/commit from dashboard → trigger build

**GitHub App (later — Phase 8):**
- Install on org level
- Auto-discover repos
- PR preview environments (deploy PR branch, tear down on merge)

### 3.8 Secrets & Environment Variables

- "shared" env vars are inherited by both prod and dev (overridable)
- Env vars injected into container at deploy time
- Changing env vars triggers a re-deploy
- Platform auto-injects: `DATABASE_URL`, `REDIS_URL`, `PORT`, `NODE_ENV`

**Encryption:**
- All env var values encrypted at rest using AES-256-GCM
- Encryption key (`ENCRYPTION_KEY`) stored OUTSIDE the database — as an environment variable or a file on disk
- The key is a 32-byte hex string (64 characters)
- Key rotation supported: re-encrypt all values with new key, track `encryptionKeyVersion` per value

```javascript
const crypto = require('crypto');
const ALGORITHM = 'aes-256-gcm';

function encrypt(plaintext, keyHex) {
  const key = Buffer.from(keyHex, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decrypt(encoded, keyHex) {
  const key = Buffer.from(keyHex, 'hex');
  const [ivB64, tagB64, dataB64] = encoded.split(':');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return decipher.update(Buffer.from(dataB64, 'base64')) + decipher.final('utf8');
}
```

---

## 4. Security Architecture

### 4.1 Docker Socket Proxy

**Never expose the raw Docker socket** to Traefik or the API process.

- Traefik gets a read-only proxy: `CONTAINERS=1, NETWORKS=1, SERVICES=1, TASKS=1` — everything else denied
- API gets a separate proxy: `CONTAINERS=1, IMAGES=1, NETWORKS=1, VOLUMES=1, BUILD=1, EXEC=1, POST=1`
- Socket proxy network is `internal: true` (no external access)

### 4.2 CSRF Protection

Double Submit Cookie via `csrf-csrf` library (same pattern as ServiceFlow).
- Cookie: `__Host-csrf-token` (production) / `csrf-token` (development)
- `SameSite=Strict`, `HttpOnly`, `Secure` (production)
- Token endpoint: `GET /api/csrf-token`
- All state-changing requests must include `x-csrf-token` header
- Exempt: `/api/auth/login`, `/api/auth/refresh`, `/api/github/webhook`, `/health`

### 4.3 Security Headers

Applied via Traefik middleware AND Helmet on the API:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`
- `Content-Security-Policy` appropriate for each context

### 4.4 Two-Factor Authentication (TOTP)

Enforced by default for the admin account.
- Library: `otplib`
- Setup: server generates TOTP secret → QR code URI → admin scans → verifies code → stores encrypted secret + 10 backup codes (bcrypt hashed)
- Login flow: password → `{ requiresTwoFactor: true, tempToken }` → TOTP code + tempToken → full JWT issued
- Backup codes: single-use, 10 generated at setup, regeneratable

### 4.5 API Keys for CI/CD

- Prefix: `fh_live_` + 40 random hex chars
- SHA-256 hash stored in DB (plaintext shown once at creation)
- Scoped: `["deploy:*"]`, `["deploy:projectSlug:prod"]`, `["read:logs"]`, etc.
- Optional `expiresAt`
- Auth middleware checks prefix: `fh_live_*` → API key lookup; else → JWT verification

### 4.6 Audit Log

Every state-changing action logged to immutable `audit_logs` table (reuses ServiceFlow pattern: never-throwing `logFromRequest` helper).

**What gets logged:** login, logout, failed login, 2FA setup, API key create/revoke, project CRUD, deploy trigger/succeed/fail/rollback, domain add/remove, database create/delete/backup/restore, env var change (key names only), container start/stop/restart/OOM, exec session open/close, cron job CRUD/execute, settings change, drain mode toggle.

### 4.7 Container Network Isolation

- Each project+env: private Docker bridge network `fh-net-{slug}-{env}`
- Project containers + their databases share this network
- Project containers also join `traefik-public` (for Traefik routing)
- No project can reach another project's network
- Platform DB/Redis are on `forjahost-internal` — not accessible from project containers

### 4.8 Rate Limiting

| Endpoint | Window | Max | Key |
|----------|--------|-----|-----|
| `POST /api/auth/login` | 15 min | 5 | IP |
| `POST /api/auth/totp/verify` | 15 min | 5 | IP |
| `POST /api/auth/refresh` | 15 min | 30 | IP |
| `POST /api/github/webhook` | 1 min | 30 | IP |
| `POST /api/projects/:id/deploy/*` | 5 min | 10 | admin user ID |
| Global `/api/*` | 1 min | 120 | admin user ID or IP |

Redis-backed (`rate-limit-redis`), falls back to in-memory.

### 4.9 Backup Encryption

- All database backups encrypted before writing to disk: AES-256-GCM
- Key: `BACKUP_ENCRYPTION_KEY` env var (separate from `ENCRYPTION_KEY`)
- File format: `{date}.sql.gz.enc` (compressed first, then encrypted)
- Key rotation: new backups use new key, old backups retain old key identifier in `Backup.encryptedWith`

---

## 5. Reliability Architecture

### 5.1 Deploy Locking

Per project+environment mutex. `DeployLock` table row with `projectId`, `environment`, `lockedAt`, `timeoutAt`. Lock timeout: 20 minutes (auto-release if holder crashes). If lock held, new deploy enters build queue.

### 5.2 Build Queue

- Configurable `MAX_CONCURRENT_BUILDS` (default: 2, via platform settings or env var)
- Priority: manual > API key > webhook
- Implemented via in-memory array + DB persistence (`Deploy.queuePosition`, `Deploy.queuedAt`)
- Queue processing loop every 5 seconds: dequeue highest priority when slot available
- Dashboard shows queue position
- Queue depth >10 → oldest queued deploys cancelled ("queue overflow")

### 5.3 Mid-Build Failure Cleanup

On platform startup:
- Query `Deploy` records with status `building` or `deploying` → mark as `failed` ("platform restart")
- Kill Docker containers matching `fh-*-build-*` pattern
- Prune dangling images
- Release expired `DeployLock` records

### 5.4 Container OOM Kill Detection

- Check Docker inspect `State.OOMKilled` + exit code 137
- Track in `ContainerState.oomKillCount` and `lastOomAt`
- 3+ OOM kills in 1 hour → high-severity alert
- Suggest increasing memory limit in alert message

### 5.5 Disk Space Management

**Image GC:** Keep last 5 images per project/env (`IMAGE_RETENTION_COUNT`), prune after each successful deploy.

**Nightly (3:00 AM):** `docker image prune -f` (dangling), compress old build logs, check disk usage.

**Weekly (Sunday 4:00 AM):** `docker builder prune --keep-storage=10GB`, compress filesystem build logs >7 days old.

**Disk usage alerts:**
- 70% → info alert
- 85% → warning alert + auto-reduce image retention to 3 + prune
- 95% → critical alert + auto-enable drain mode (deploys paused)

### 5.6 Traefik Crash Recovery

- `restart: always` in docker-compose
- `acme.json` on named Docker volume (`traefik-certs`)
- API pings Traefik health endpoint every 60 seconds
- If down >2 minutes: critical alert, attempt `docker restart traefik`

### 5.7 Health Check Configuration

Per-project configurable:

| Field | Default | Description |
|-------|---------|-------------|
| `healthCheckPath` | `/` | HTTP path |
| `healthCheckMethod` | `GET` | HTTP method |
| `healthCheckExpectedStatus` | `200` | Expected status code |
| `healthCheckTimeoutSec` | `60` | Total timeout |
| `healthCheckIntervalSec` | `3` | Seconds between checks |

### 5.8 Graceful Shutdown

**Platform API:** On SIGTERM/SIGINT → stop new HTTP connections → stop cron jobs → flush logs → drain build queue (wait up to 60s) → disconnect Redis/Postgres → exit.

**Project containers (re-deploy):** Remove Traefik labels → wait 5s for route drain → `docker stop --time={stopGracePeriodSec}` → SIGTERM → SIGKILL after timeout.

### 5.9 Backup Verification

Weekly automated test restore:
1. Pick latest backup per database
2. Start temporary Postgres container
3. Decrypt + restore
4. Run `SELECT 1` + table count
5. Destroy temporary container
6. Update `Backup.verifiedAt`, `Backup.verificationStatus`
7. Alert if verification fails

SHA-256 checksum computed at backup time, verified before restore.

### 5.10 Orphan Resource Reconciliation

Hourly job:
1. List Docker containers/networks matching `fh-*` prefix
2. Compare with `ContainerState` table
3. Docker-only containers → warn, stop and remove after 2 consecutive detections
4. DB-only records → update status to `stopped`, create alert
5. Networks with no connected containers → remove
6. Volumes with no references → flag for review (never auto-delete data)

### 5.11 Stale Deploy Recovery

On platform startup:
1. Query `Deploy` with status `building`/`deploying`
2. Check if corresponding Docker container/build is running
3. If not: mark `failed` ("stale deploy recovered on platform restart")
4. Release expired `DeployLock` records

---

## 6. New Features

### 6.1 Container Exec / Web Terminal

- Frontend: xterm.js terminal component
- Backend: WebSocket endpoint `/api/projects/:id/terminal/:env`
- Uses `dockerode.container.exec()` — starts `/bin/sh` or `/bin/bash`
- Every terminal session audit logged (start, end, project, env)
- 30-minute idle timeout, max 3 concurrent sessions per project

**Protocol:**
1. Client connects with JWT in auth handshake
2. Server creates Docker exec instance with TTY
3. Client sends: `{ type: 'input', data: '...' }` and `{ type: 'resize', cols, rows }`
4. Server sends: `{ type: 'output', data: '...' }`

### 6.2 Cron Job Management

Per-project cron jobs managed from dashboard.
- Execute INSIDE project's running container via `docker exec`
- Run history tracked: start time, end time, exit code, output (last 10KB)
- Container not running when cron fires → skip, log warning
- Max 10 cron jobs per project
- Cron expressions validated with `cron-parser`

### 6.3 Drain Mode

**Global:** `PUT /api/settings { drainMode: true }` — queues all incoming deploy requests, existing deploys complete. Dashboard banner shown.

**Per-project:** `PUT /api/projects/:id { drainMode: true }` — same but scoped to one project.

### 6.4 Monorepo Support

Projects configure `buildContext`, `dockerfilePath`, `buildArgs`. Build flow clones full repo, sets context to `{repoDir}/{buildContext}`, passes dockerfilePath as `-f` flag.

### 6.5 Migration Command

- Per-project `migrationCommand` field (e.g., `npx prisma migrate deploy`)
- Runs inside NEW container AFTER start but BEFORE health check
- Exit code != 0 → deploy fails, new container removed, old kept
- Output captured in deploy log

### 6.6 Server Health Dashboard

Host-level metrics (not just containers): CPU, RAM, disk from `/proc`, Docker daemon status, Traefik status, platform uptime. Collected every 30 seconds, 24h in-memory circular buffer, hourly aggregates to DB for 30-day history.

---

## 7. Dashboard UI

React SPA served by the platform API.

### Pages

```
/                                → Project list (cards with status indicators)
/projects/new                    → Create project (GitHub URL, branches, monorepo settings)
/projects/:id                    → Project overview (current deploy, resources, activity)
/projects/:id/deploys            → Deploy history with logs, queue status
/projects/:id/env                → Environment variables editor
/projects/:id/domains            → Domain management + SSL status + expiry
/projects/:id/databases          → Database list, connection info, backup/restore
/projects/:id/storage            → Storage volumes, usage
/projects/:id/logs               → Live container log stream (WebSocket)
/projects/:id/terminal           → Web terminal (xterm.js)
/projects/:id/cron               → Cron job management + run history
/projects/:id/settings           → Build config, resources, health check, monorepo, danger zone
/projects/:id/metrics            → CPU, memory, network, disk charts (container)
/activity                        → Global activity feed (filterable by project)
/alerts                          → Alert center (notifications, acknowledge/dismiss)
/audit-log                       → Audit log viewer (filterable, searchable)
/server-health                   → Host CPU/RAM/disk charts, Docker status
/settings                        → Platform settings (GitHub token, 2FA, drain mode)
/settings/api-keys               → API key management
/settings/backups                → Backup config, verification status
```

### Key UI Features
- Real-time build log streaming (WebSocket)
- One-click rollback to any previous deploy
- Container resource monitoring charts
- Deploy status badges per project
- Build queue visualization
- xterm.js web terminal
- Alert bell with unread count in header
- Drain mode toggle with confirmation
- API key creation (one-time display)

---

## 8. Notification System (Dashboard-Only)

### Alert Types

| Type | Severity | Trigger |
|------|----------|---------|
| `deploy.failed` | error | Deploy fails |
| `deploy.succeeded` | info | Deploy completes |
| `container.oom` | warning | OOM kill (exit 137) |
| `container.oom.repeated` | error | 3+ OOM kills in 1 hour |
| `container.crash_loop` | error | 5+ restarts in 10 minutes |
| `disk.warning` | warning | Disk >70% |
| `disk.critical` | error | Disk >85% |
| `disk.emergency` | error | Disk >95% (deploys paused) |
| `ssl.expiring` | warning | SSL expires within 7 days |
| `backup.failed` | error | Backup failed |
| `backup.verification_failed` | error | Test restore failed |
| `traefik.down` | error | Traefik unresponsive >2 min |
| `security.failed_login` | warning | 3+ failed logins from same IP |
| `api_key.expiring` | info | API key expires within 7 days |

Alerts stored in `Alert` table, delivered via Socket.io real-time + persistent for offline viewing.

---

## 9. Tech Stack

| Component | Technology | Reason |
|-----------|-----------|--------|
| Dashboard | React + Vite + Tailwind + TanStack Query | Consistent with ServiceFlow skills |
| API | Node.js + Express | Same as ServiceFlow backend |
| Database (platform) | PostgreSQL 16 | Full relational power, JSONB |
| Cache / Rate limits | Redis 7 | Token blacklist, rate limiting, cache |
| Container orchestration | Docker Engine API (dockerode) | Direct control, no K8s complexity |
| Reverse proxy | Traefik v3 | Auto SSL, Docker-native routing |
| Docker socket proxy | tecnativa/docker-socket-proxy | Security isolation |
| Build system | Docker BuildKit | Layer caching, --secret support |
| Process manager | systemd | Native Linux, auto-start on boot |
| Auth | bcrypt + JWT (15min) + httpOnly refresh cookie | ServiceFlow pattern |
| 2FA | otplib | TOTP standard |
| Validation | Zod | Schema-based request validation |
| Realtime | Socket.io | JWT-auth WebSocket, room broadcasting |
| Terminal | xterm.js + dockerode exec | Interactive shell sessions |
| Cron | node-cron | In-process scheduling |

### Patterns reused from ServiceFlow

1. **Auth**: JWT access (15min) + opaque refresh in httpOnly cookie, token blacklist via Redis SHA-256 hash
2. **Error handling**: Single `AppError` class, `asyncHandler` wrapper, sanitizing `errorHandler` middleware
3. **Validation**: Zod schemas + `validate(schema, 'body'|'query')` middleware
4. **Cache**: `cache.wrap(key, fn, ttl)` with thundering herd prevention, graceful Redis fallback
5. **Realtime**: Socket.io with JWT in handshake, emitter/events separation
6. **Audit log**: Never-throwing `logFromRequest` helper, real-time broadcast
7. **Cron jobs**: Per-job `running` flag, explicit start/stop, `getJobsStatus` export
8. **Server composition**: Static before Helmet, webhooks before body-parser, CSRF token before CSRF middleware, rate limiters specific-to-broad, graceful shutdown

---

## 10. File Structure

```
forjahost/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── middleware/
│   │   │   │   ├── asyncHandler.js
│   │   │   │   ├── authenticate.js       // JWT + API key dual auth
│   │   │   │   ├── csrfProtection.js
│   │   │   │   ├── errorHandler.js
│   │   │   │   ├── rateLimiter.js
│   │   │   │   └── validate.js
│   │   │   ├── routes/
│   │   │   │   ├── auth.js               // login, refresh, logout, 2FA
│   │   │   │   ├── projects.js
│   │   │   │   ├── deploys.js
│   │   │   │   ├── domains.js
│   │   │   │   ├── databases.js
│   │   │   │   ├── storage.js
│   │   │   │   ├── envVars.js
│   │   │   │   ├── github.js             // webhook receiver
│   │   │   │   ├── cronJobs.js
│   │   │   │   ├── apiKeys.js
│   │   │   │   ├── alerts.js
│   │   │   │   ├── auditLog.js
│   │   │   │   ├── serverHealth.js
│   │   │   │   └── settings.js
│   │   │   ├── schemas/
│   │   │   │   ├── authSchema.js
│   │   │   │   ├── projectSchema.js
│   │   │   │   ├── deploySchema.js
│   │   │   │   ├── domainSchema.js
│   │   │   │   ├── databaseSchema.js
│   │   │   │   ├── envVarSchema.js
│   │   │   │   ├── cronJobSchema.js
│   │   │   │   ├── apiKeySchema.js
│   │   │   │   └── settingsSchema.js
│   │   │   ├── services/
│   │   │   │   ├── authService.js
│   │   │   │   ├── buildService.js
│   │   │   │   ├── deployService.js
│   │   │   │   ├── deployLockService.js
│   │   │   │   ├── buildQueueService.js
│   │   │   │   ├── containerService.js
│   │   │   │   ├── proxyService.js       // Traefik label management
│   │   │   │   ├── databaseService.js
│   │   │   │   ├── storageService.js
│   │   │   │   ├── backupService.js
│   │   │   │   ├── backupVerificationService.js
│   │   │   │   ├── githubService.js
│   │   │   │   ├── secretService.js      // AES-256-GCM
│   │   │   │   ├── cronJobService.js
│   │   │   │   ├── apiKeyService.js
│   │   │   │   ├── alertService.js
│   │   │   │   ├── auditLogService.js
│   │   │   │   ├── serverHealthService.js
│   │   │   │   ├── diskManagementService.js
│   │   │   │   ├── orphanReconciliationService.js
│   │   │   │   └── totpService.js
│   │   │   ├── docker/
│   │   │   │   ├── client.js             // dockerode via socket proxy
│   │   │   │   └── buildpacks/
│   │   │   │       ├── node-static.js
│   │   │   │       ├── node-server.js
│   │   │   │       └── static.js
│   │   │   ├── realtime/
│   │   │   │   ├── index.js              // Socket.io setup
│   │   │   │   ├── emitter.js            // setIO/getIO, emit helpers
│   │   │   │   ├── events.js             // broadcastDeploy, broadcastAlert
│   │   │   │   ├── logStreamer.js
│   │   │   │   ├── statsStreamer.js
│   │   │   │   └── terminalHandler.js    // xterm.js WebSocket handler
│   │   │   ├── jobs/
│   │   │   │   ├── index.js
│   │   │   │   ├── backupJob.js
│   │   │   │   ├── backupVerificationJob.js
│   │   │   │   ├── diskCleanupJob.js
│   │   │   │   ├── orphanReconciliationJob.js
│   │   │   │   ├── logRetentionJob.js
│   │   │   │   ├── sslMonitorJob.js
│   │   │   │   └── healthMonitorJob.js
│   │   │   ├── utils/
│   │   │   │   ├── errors.js
│   │   │   │   ├── cache.js
│   │   │   │   ├── logger.js
│   │   │   │   └── token.js
│   │   │   ├── lib/
│   │   │   │   ├── prisma.js
│   │   │   │   └── redis.js
│   │   │   └── server.js
│   │   └── package.json
│   └── dashboard/
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   │   ├── layout/
│       │   │   ├── terminal/
│       │   │   ├── deploy/
│       │   │   ├── charts/
│       │   │   └── common/
│       │   ├── hooks/
│       │   ├── services/
│       │   ├── context/
│       │   └── utils/
│       └── package.json
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── traefik/
│   ├── traefik.yml
│   └── dynamic/
│       └── security-headers.yml
├── scripts/
│   ├── install.sh
│   ├── backup.sh
│   └── re-encrypt.sh
├── docker-compose.yml
└── package.json
```

---

## 11. Data Model (Prisma + PostgreSQL)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ── Projects ──

model Project {
  id                        String    @id @default(uuid())
  name                      String    @unique
  slug                      String    @unique
  githubUrl                 String    @map("github_url")
  branchProd                String    @default("main") @map("branch_prod")
  branchDev                 String?   @map("branch_dev")
  buildpack                 String    @default("dockerfile")

  // Monorepo
  buildContext              String    @default(".") @map("build_context")
  dockerfilePath            String    @default("Dockerfile") @map("dockerfile_path")
  buildArgs                 Json?     @map("build_args")
  buildNetworkMode          String    @default("default") @map("build_network_mode")
  buildTimeoutSec           Int       @default(900) @map("build_timeout_sec")

  // Resources
  resourceCpuLimit          Float     @default(1.0) @map("resource_cpu_limit")
  resourceMemoryLimit       Int       @default(512) @map("resource_memory_limit")

  // Health check
  healthCheckPath           String    @default("/") @map("health_check_path")
  healthCheckMethod         String    @default("GET") @map("health_check_method")
  healthCheckExpectedStatus Int       @default(200) @map("health_check_expected_status")
  healthCheckTimeoutSec     Int       @default(60) @map("health_check_timeout_sec")
  healthCheckIntervalSec    Int       @default(3) @map("health_check_interval_sec")

  // Deploy
  migrationCommand          String?   @map("migration_command")
  stopGracePeriodSec        Int       @default(30) @map("stop_grace_period_sec")
  webhookSecret             String?   @map("webhook_secret")
  drainMode                 Boolean   @default(false) @map("drain_mode")

  createdAt                 DateTime  @default(now()) @map("created_at")
  updatedAt                 DateTime  @updatedAt @map("updated_at")

  deploys         Deploy[]
  domains         Domain[]
  databases       Database[]
  storageVolumes  StorageVolume[]
  envVars         EnvVar[]
  logEntries      LogEntry[]
  deployLocks     DeployLock[]
  containerStates ContainerState[]
  cronJobs        CronJob[]
  alerts          Alert[]

  @@map("projects")
}

// ── Deploys ──

model Deploy {
  id               String    @id @default(uuid())
  projectId        String    @map("project_id")
  environment      String
  commitSha        String?   @map("commit_sha")
  commitMessage    String?   @map("commit_message")
  branch           String?
  imageTag         String?   @map("image_tag")
  status           String    @default("queued") // queued | building | deploying | live | failed | rolled_back | cancelled
  buildLog         String?   @map("build_log")
  buildLogPath     String?   @map("build_log_path")
  buildDurationMs  Int?      @map("build_duration_ms")
  failReason       String?   @map("fail_reason")
  queuePosition    Int?      @map("queue_position")
  queuedAt         DateTime? @map("queued_at")
  startedAt        DateTime? @map("started_at")
  triggeredBy      String    @default("manual") @map("triggered_by")
  triggeredByKeyId String?   @map("triggered_by_key_id")
  createdAt        DateTime  @default(now()) @map("created_at")
  finishedAt       DateTime? @map("finished_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, environment])
  @@index([status])
  @@index([queuePosition])
  @@map("deploys")
}

// ── Deploy Locks ──

model DeployLock {
  id          String   @id @default(uuid())
  projectId   String   @map("project_id")
  environment String
  deployId    String   @map("deploy_id")
  lockedAt    DateTime @default(now()) @map("locked_at")
  timeoutAt   DateTime @map("timeout_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, environment])
  @@map("deploy_locks")
}

// ── Container State ──

model ContainerState {
  id            String    @id @default(uuid())
  projectId     String    @map("project_id")
  environment   String
  containerId   String    @unique @map("container_id")
  containerName String    @map("container_name")
  imageTag      String    @map("image_tag")
  status        String    @default("running")
  startedAt     DateTime  @map("started_at")
  restartCount  Int       @default(0) @map("restart_count")
  oomKillCount  Int       @default(0) @map("oom_kill_count")
  lastOomAt     DateTime? @map("last_oom_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, environment])
  @@map("container_states")
}

// ── Domains ──

model Domain {
  id           String    @id @default(uuid())
  projectId    String    @map("project_id")
  environment  String
  hostname     String    @unique
  sslStatus    String    @default("pending") @map("ssl_status")
  sslIssuedAt  DateTime? @map("ssl_issued_at")
  sslExpiresAt DateTime? @map("ssl_expires_at")
  isDefault    Boolean   @default(false) @map("is_default")
  createdAt    DateTime  @default(now()) @map("created_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@map("domains")
}

// ── Databases ──

model Database {
  id                   String   @id @default(uuid())
  projectId            String   @map("project_id")
  environment          String
  engine               String
  version              String
  containerName        String   @unique @map("container_name")
  internalPort         Int?     @map("internal_port")
  credentialsEncrypted String?  @map("credentials_encrypted")
  backupSchedule       String   @default("0 3 * * *") @map("backup_schedule")
  createdAt            DateTime @default(now()) @map("created_at")

  project Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  backups Backup[]

  @@map("databases")
}

// ── Storage Volumes ──

model StorageVolume {
  id            String   @id @default(uuid())
  projectId     String   @map("project_id")
  environment   String
  name          String
  mountPath     String   @map("mount_path")
  hostPath      String   @map("host_path")
  sizeLimitMb   Int      @default(5000) @map("size_limit_mb")
  currentSizeMb Int      @default(0) @map("current_size_mb")
  createdAt     DateTime @default(now()) @map("created_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@map("storage_volumes")
}

// ── Environment Variables ──

model EnvVar {
  id                   String  @id @default(uuid())
  projectId            String  @map("project_id")
  environment          String
  key                  String
  valueEncrypted       String  @map("value_encrypted")
  isSecret             Boolean @default(false) @map("is_secret")
  encryptionKeyVersion Int     @default(1) @map("encryption_key_version")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, environment, key])
  @@map("env_vars")
}

// ── Backups ──

model Backup {
  id                 String    @id @default(uuid())
  databaseId         String    @map("database_id")
  filePath           String    @map("file_path")
  sizeBytes          BigInt?   @map("size_bytes")
  status             String    @default("completed")
  checksum           String?
  encryptedWith      String?   @map("encrypted_with")
  verifiedAt         DateTime? @map("verified_at")
  verificationStatus String?   @map("verification_status")
  createdAt          DateTime  @default(now()) @map("created_at")

  database Database @relation(fields: [databaseId], references: [id], onDelete: Cascade)

  @@map("backups")
}

// ── Log Entries ──

model LogEntry {
  id          String   @id @default(uuid())
  projectId   String   @map("project_id")
  environment String
  source      String
  message     String
  metadata    Json?
  timestamp   DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId, environment, timestamp])
  @@index([timestamp])
  @@map("log_entries")
}

// ── Audit Log ──

model AuditLog {
  id          String   @id @default(uuid())
  actor       String
  action      String
  resource    String
  resourceId  String?  @map("resource_id")
  description String
  metadata    Json?
  ipAddress   String?  @map("ip_address")
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([resource, resourceId])
  @@index([actor])
  @@index([action])
  @@index([createdAt])
  @@map("audit_logs")
}

// ── API Keys ──

model ApiKey {
  id         String    @id @default(uuid())
  name       String
  keyHash    String    @unique @map("key_hash")
  keyPrefix  String    @map("key_prefix")
  scopes     Json
  expiresAt  DateTime? @map("expires_at")
  revokedAt  DateTime? @map("revoked_at")
  lastUsedAt DateTime? @map("last_used_at")
  createdAt  DateTime  @default(now()) @map("created_at")

  @@index([keyHash])
  @@map("api_keys")
}

// ── Alerts ──

model Alert {
  id             String    @id @default(uuid())
  type           String
  severity       String
  message        String
  projectId      String?   @map("project_id")
  metadata       Json?
  acknowledged   Boolean   @default(false)
  acknowledgedAt DateTime? @map("acknowledged_at")
  createdAt      DateTime  @default(now()) @map("created_at")

  project Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)

  @@index([type])
  @@index([severity])
  @@index([acknowledged])
  @@index([createdAt])
  @@map("alerts")
}

// ── TOTP / 2FA ──

model TotpSecret {
  id              String   @id @default(uuid())
  secretEncrypted String   @map("secret_encrypted")
  backupCodesHash Json     @map("backup_codes_hash")
  enabled         Boolean  @default(false)
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@map("totp_secrets")
}

// ── Cron Jobs ──

model CronJob {
  id        String   @id @default(uuid())
  projectId String   @map("project_id")
  name      String
  schedule  String
  command   String
  enabled   Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  project Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  runs    CronJobRun[]

  @@map("cron_jobs")
}

model CronJobRun {
  id         String    @id @default(uuid())
  cronJobId  String    @map("cron_job_id")
  exitCode   Int?      @map("exit_code")
  output     String?
  startedAt  DateTime  @map("started_at")
  finishedAt DateTime? @map("finished_at")
  status     String    @default("running")

  cronJob CronJob @relation(fields: [cronJobId], references: [id], onDelete: Cascade)

  @@index([cronJobId, startedAt])
  @@map("cron_job_runs")
}

// ── Platform Settings ──

model PlatformSettings {
  key   String @id
  value String

  @@map("platform_settings")
}
```

---

## 12. API Endpoints

### Authentication
```
POST   /api/auth/login                           — login (username + password)
POST   /api/auth/totp/verify                     — verify TOTP code (after login)
POST   /api/auth/refresh                         — refresh access token
POST   /api/auth/logout                          — logout (blacklist token)
GET    /api/csrf-token                           — get CSRF token
POST   /api/auth/totp/setup                      — generate TOTP secret + QR
POST   /api/auth/totp/enable                     — verify + enable 2FA
POST   /api/auth/totp/disable                    — disable 2FA
GET    /api/auth/totp/backup-codes               — regenerate backup codes
```

### API Keys
```
GET    /api/api-keys                             — list keys
POST   /api/api-keys                             — create key (plaintext shown once)
DELETE /api/api-keys/:id                         — revoke key
```

### Projects
```
GET    /api/projects                             — list projects
POST   /api/projects                             — create project
GET    /api/projects/:id                         — project details
PUT    /api/projects/:id                         — update settings
DELETE /api/projects/:id                         — delete project + resources
```

### Deploys
```
POST   /api/projects/:id/deploy/:env             — trigger deploy
GET    /api/projects/:id/deploys                  — deploy history (paginated)
GET    /api/projects/:id/deploys/:deployId        — deploy detail + log
POST   /api/projects/:id/deploys/:deployId/rollback  — rollback
POST   /api/projects/:id/deploys/:deployId/cancel    — cancel queued deploy
GET    /api/projects/:id/deploys/queue            — current queue
```

### Domains
```
GET    /api/projects/:id/domains                  — list domains
POST   /api/projects/:id/domains                  — add domain
DELETE /api/projects/:id/domains/:domainId        — remove domain
```

### Databases
```
GET    /api/projects/:id/databases                — list databases
POST   /api/projects/:id/databases                — provision DB
DELETE /api/projects/:id/databases/:dbId           — delete database
POST   /api/projects/:id/databases/:dbId/backup    — trigger backup
GET    /api/projects/:id/databases/:dbId/backups    — list backups
POST   /api/projects/:id/databases/:dbId/backups/:backupId/restore  — restore
```

### Storage
```
GET    /api/projects/:id/storage                  — list volumes
POST   /api/projects/:id/storage                  — create volume
DELETE /api/projects/:id/storage/:volId            — delete volume
```

### Environment Variables
```
GET    /api/projects/:id/env/:env                 — list (values masked for secrets)
PUT    /api/projects/:id/env/:env                 — bulk update
```

### Logs & Streaming
```
WS     /api/projects/:id/logs/:env/stream         — live container logs
WS     /api/projects/:id/deploys/:deployId/stream  — build log stream
GET    /api/projects/:id/logs/:env                — historical logs (paginated)
```

### Terminal
```
WS     /api/projects/:id/terminal/:env            — web terminal (xterm.js)
```

### Container Stats
```
GET    /api/projects/:id/stats/:env               — current snapshot
WS     /api/projects/:id/stats/:env/stream        — live stats
```

### Cron Jobs
```
GET    /api/projects/:id/cron-jobs                — list
POST   /api/projects/:id/cron-jobs                — create
PUT    /api/projects/:id/cron-jobs/:cronId         — update
DELETE /api/projects/:id/cron-jobs/:cronId         — delete
POST   /api/projects/:id/cron-jobs/:cronId/run     — trigger manual run
GET    /api/projects/:id/cron-jobs/:cronId/runs    — run history
```

### Alerts
```
GET    /api/alerts                                — list (filterable)
POST   /api/alerts/:id/acknowledge                — acknowledge
POST   /api/alerts/acknowledge-all                — acknowledge all
```

### Audit Log & Activity
```
GET    /api/audit-log                             — list (filterable, paginated)
GET    /api/activity                              — global activity feed
GET    /api/projects/:id/activity                 — project activity
```

### Server Health
```
GET    /api/server-health                         — host CPU/RAM/disk
GET    /api/server-health/docker                  — Docker info
```

### Settings
```
GET    /api/settings                              — platform settings
PUT    /api/settings                              — update (drain mode, etc.)
```

### GitHub
```
POST   /api/github/webhook                        — push events (raw body, signature verified)
```

---

## 13. Traefik Configuration

```yaml
# traefik/traefik.yml
api:
  dashboard: false

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"
    http:
      middlewares:
        - security-headers@file

providers:
  docker:
    endpoint: "tcp://docker-socket-proxy-readonly:2375"
    exposedByDefault: false
    network: traefik-public
  file:
    directory: "/etc/traefik/dynamic"
    watch: true

certificatesResolvers:
  letsencrypt:
    acme:
      email: "${ADMIN_EMAIL}"
      storage: "/letsencrypt/acme.json"
      httpChallenge:
        entryPoint: web

log:
  level: WARN
```

```yaml
# traefik/dynamic/security-headers.yml
http:
  middlewares:
    security-headers:
      headers:
        customResponseHeaders:
          X-Content-Type-Options: "nosniff"
          X-XSS-Protection: "0"
          Referrer-Policy: "strict-origin-when-cross-origin"
          Permissions-Policy: "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
        stsSeconds: 31536000
        stsIncludeSubdomains: true
        stsPreload: true
        frameDeny: true
        contentTypeNosniff: true
```

---

## 14. docker-compose.yml

```yaml
version: "3.8"

services:
  docker-socket-proxy-readonly:
    image: tecnativa/docker-socket-proxy:latest
    environment:
      CONTAINERS: 1
      NETWORKS: 1
      SERVICES: 1
      TASKS: 1
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - socket-proxy
    restart: always

  docker-socket-proxy-api:
    image: tecnativa/docker-socket-proxy:latest
    environment:
      CONTAINERS: 1
      IMAGES: 1
      NETWORKS: 1
      VOLUMES: 1
      BUILD: 1
      EXEC: 1
      POST: 1
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - socket-proxy
    restart: always

  traefik:
    image: traefik:v3.0
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./traefik/traefik.yml:/etc/traefik/traefik.yml:ro
      - ./traefik/dynamic:/etc/traefik/dynamic:ro
      - traefik-certs:/letsencrypt
      - traefik-logs:/var/log/traefik
    networks:
      - traefik-public
      - socket-proxy
    depends_on:
      - docker-socket-proxy-readonly
    restart: always
    labels:
      - "traefik.enable=false"

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: forjahost
      POSTGRES_USER: forjahost
      POSTGRES_PASSWORD: ${PLATFORM_DB_PASSWORD}
    volumes:
      - platform-pgdata:/var/lib/postgresql/data
    networks:
      - forjahost-internal
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U forjahost"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${PLATFORM_REDIS_PASSWORD} --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - platform-redis:/data
    networks:
      - forjahost-internal
    restart: always
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${PLATFORM_REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
      PORT: 4000
      DATABASE_URL: postgresql://forjahost:${PLATFORM_DB_PASSWORD}@postgres:5432/forjahost
      REDIS_URL: redis://:${PLATFORM_REDIS_PASSWORD}@redis:6379
      DOCKER_HOST: tcp://docker-socket-proxy-api:2375
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      BACKUP_ENCRYPTION_KEY: ${BACKUP_ENCRYPTION_KEY}
      CSRF_SECRET: ${CSRF_SECRET}
      ADMIN_EMAIL: ${ADMIN_EMAIL}
      DASHBOARD_URL: ${DASHBOARD_URL}
    volumes:
      - /var/forjahost:/var/forjahost
      - buildkit-cache:/var/forjahost/buildkit-cache
    networks:
      - forjahost-internal
      - traefik-public
      - socket-proxy
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      docker-socket-proxy-api:
        condition: service_started
    restart: always
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.forjahost-api.rule=Host(`${DASHBOARD_DOMAIN}`)"
      - "traefik.http.routers.forjahost-api.tls.certresolver=letsencrypt"
      - "traefik.http.routers.forjahost-api.middlewares=security-headers@file"
      - "traefik.http.services.forjahost-api.loadbalancer.server.port=4000"
      - "traefik.docker.network=traefik-public"

volumes:
  platform-pgdata:
  platform-redis:
  traefik-certs:
  traefik-logs:
  buildkit-cache:

networks:
  traefik-public:
    external: true
  forjahost-internal:
    driver: bridge
  socket-proxy:
    driver: bridge
    internal: true
```

---

## 15. Implementation Phases

### Phase 1 — Foundation + Security (Weeks 1-3)

1. Project scaffolding (API + dashboard, Vite + Tailwind + TanStack Query)
2. PostgreSQL schema + Prisma migrations (full schema from day one)
3. Platform Redis setup
4. Auth: bcrypt + JWT (15min access) + httpOnly refresh cookie + token blacklist
5. TOTP 2FA (otplib, QR, backup codes) — enforced by default
6. CSRF protection (csrf-csrf, double-submit cookie)
7. Security headers (Helmet)
8. Rate limiting (login: 5/15min, global: 120/min)
9. `AppError`, `asyncHandler`, sanitizing `errorHandler`
10. Zod validation middleware
11. Audit log service
12. Docker socket proxy setup
13. Docker client wrapper (dockerode via socket proxy)
14. `secretService.js` — AES-256-GCM
15. Deploy locking service
16. Build queue service
17. Stale deploy recovery on startup

### Phase 2 — Core Deploy Pipeline (Weeks 3-5)

18. Build service (clone → docker build → tag, BuildKit --secret, .git exclusion)
19. Deploy service (zero-downtime swap, health check, graceful shutdown)
20. Container service (start, stop, restart, inspect, stats)
21. Projects CRUD API + dashboard pages
22. Manual deploy trigger
23. Build log streaming (WebSocket)
24. Deploy history + timeline UI
25. Rollback
26. Monorepo support
27. Migration command execution
28. Mid-build failure cleanup

### Phase 3 — Networking & Domains (Weeks 5-6)

29. Traefik setup with Docker provider (via socket proxy)
30. Security headers middleware (Traefik file provider)
31. Container network isolation
32. Domain CRUD + Traefik label management
33. Auto SSL via Let's Encrypt
34. Dev environment subdomains
35. SSL expiry monitoring
36. Traefik crash recovery

### Phase 4 — Databases, Storage & Backups (Weeks 6-8)

37. Database provisioning (Postgres + Redis on project network)
38. Auto-inject connection strings
39. Backup service (pg_dump, compress, encrypt)
40. Backup verification (weekly test restore, checksum)
41. One-click restore
42. Storage volume management
43. Disk space management (image GC, nightly prune, alerts)

### Phase 5 — GitHub Integration & API Keys (Weeks 8-9)

44. GitHub webhook receiver (raw body, HMAC-SHA256 verification)
45. Auto-deploy on push
46. Commit status reporting
47. Branch/commit picker
48. API keys (create, revoke, scoped, hashed)
49. API key auth in deploy endpoint

### Phase 6 — Monitoring, Terminal & Advanced (Weeks 9-12)

50. Live log streaming
51. Container stats charts
52. Server health dashboard
53. Web terminal (xterm.js, audit logged)
54. Cron job management
55. Alert engine (OOM, crash loop, disk, SSL)
56. Alert UI
57. Activity feed
58. Drain mode
59. Orphan reconciliation
60. Build log size management

### Phase 7 — Hardening & Ops (Weeks 12-13)

61. `install.sh` server setup script
62. `re-encrypt.sh` key rotation
63. Backup encryption key rotation
64. Comprehensive error handling
65. Security checklist verification

### Phase 8 — Future (unscheduled)

66. PR preview environments (requires GitHub App)
67. Multi-node support (Docker Swarm)
68. Custom buildpacks
69. Database web UI (pgweb/redis-commander)

---

## 16. Security Checklist

### Authentication & Authorization
- [ ] Admin password bcrypt (cost >= 12)
- [ ] JWT access tokens expire in 15 minutes
- [ ] Refresh tokens in httpOnly, Secure, SameSite=Strict cookie
- [ ] Token blacklist via Redis SHA-256 hash
- [ ] TOTP 2FA enabled and enforced
- [ ] 10 backup codes, bcrypt hashed, single-use
- [ ] API keys use SHA-256 hash storage
- [ ] API key scope enforcement on every request
- [ ] `fh_live_` prefix distinguishes API keys from JWTs

### CSRF & Headers
- [ ] CSRF double-submit cookie (csrf-csrf)
- [ ] `__Host-` prefix in production
- [ ] SameSite=Strict, HttpOnly, Secure
- [ ] GitHub webhook exempt (uses signature)
- [ ] Helmet with strict CSP
- [ ] X-Content-Type-Options, X-Frame-Options, HSTS, Referrer-Policy, Permissions-Policy
- [ ] Traefik security-headers middleware on all containers

### Docker Security
- [ ] Raw socket never exposed to any container
- [ ] Traefik uses read-only socket proxy
- [ ] API uses separate controlled-permission proxy
- [ ] Socket proxy network is internal
- [ ] Each project uses isolated Docker network
- [ ] No cross-project communication
- [ ] Platform network not accessible from projects
- [ ] Container resource limits enforced

### Build Security
- [ ] `.git` excluded from build context
- [ ] BuildKit `--secret` for build-time credentials
- [ ] Build network mode configurable
- [ ] Build timeout enforced

### Data Encryption
- [ ] Env var values AES-256-GCM encrypted
- [ ] DB credentials encrypted
- [ ] GitHub tokens encrypted
- [ ] TOTP secrets encrypted
- [ ] Webhook secrets encrypted
- [ ] Encryption key stored outside DB
- [ ] Key version tracked per value
- [ ] Key rotation tested
- [ ] Backups encrypted with separate key

### Rate Limiting
- [ ] Login: 5/15min/IP
- [ ] TOTP verify: 5/15min/IP
- [ ] Refresh: 30/15min/IP
- [ ] Global: 120/min/user
- [ ] Deploy: 10/5min/user
- [ ] Webhook: 30/min/IP
- [ ] Redis-backed with in-memory fallback

### GitHub
- [ ] Webhook HMAC-SHA256 + timing-safe comparison
- [ ] Unique secret per project
- [ ] Raw body before JSON middleware
- [ ] Secret rotatable from dashboard

### Audit
- [ ] All state-changing actions logged
- [ ] Actor, action, resource, IP, timestamp
- [ ] Append-only (no UPDATE/DELETE)
- [ ] Failed logins logged with IP
- [ ] Terminal sessions logged
- [ ] Sensitive values never logged

---

## 17. Operational Runbook

### 17.1 Add a New Project
1. Dashboard `/projects/new` → enter GitHub URL, branches, monorepo settings
2. Configure resources, health check, migration command
3. Add domains at `/projects/:id/domains`
4. Set env vars at `/projects/:id/env/:env`
5. Provision database at `/projects/:id/databases`
6. Trigger first deploy

### 17.2 Handle Disk Full
1. `df -h /var/forjahost` and `docker system df`
2. If >95%, drain mode auto-enabled — confirm at `/settings`
3. `docker image prune -af` to remove unused images
4. Reduce `IMAGE_RETENTION_COUNT` to 2
5. `docker builder prune --keep-storage=5GB -f`
6. Check `/var/forjahost/logs/builds/` for large logs
7. Remove old backups beyond retention
8. Verify <70%, disable drain mode, acknowledge alerts

### 17.3 Rotate Encryption Key
1. Generate: `openssl rand -hex 32`
2. Set `ENCRYPTION_KEY_NEW` in API environment
3. Run `./scripts/re-encrypt.sh` (reads all, decrypts with old, re-encrypts with new, updates versions, transaction)
4. Set `ENCRYPTION_KEY` to new value, remove `_NEW`, restart API
5. Verify env var decryption from dashboard

### 17.4 Recover from Traefik Crash
1. `docker ps -f name=traefik` — check status
2. `docker logs traefik --tail 100` — check errors
3. `docker restart traefik` (restart policy should auto-recover)
4. Verify acme.json volume: `docker volume inspect traefik-certs`
5. If acme.json corrupted: remove it, restart (certs re-issued)
6. Verify socket proxy: `docker ps -f name=docker-socket-proxy-readonly`
7. Acknowledge alert

### 17.5 Handle Stuck Deploys
1. Check if build container exists: `docker ps -f label=forjahost.build=true`
2. Kill stuck container: `docker rm -f {id}`
3. Force unlock via dashboard or `DELETE /api/projects/:id/deploy-lock/:env`
4. Mark deploy as failed
5. Retry

### 17.6 Handle OOM Kills
1. Check `/projects/:id/metrics` for memory pattern
2. If genuine need: increase `resourceMemoryLimit` in settings
3. If leak: check application logs
4. Container auto-restarts after OOM

### 17.7 Restore a Database
1. `/projects/:id/databases` → select database → "Backups"
2. Pick backup (prefer `verificationStatus: passed`)
3. Click "Restore" — stops DB, decrypts, restores, restarts
4. Verify application works

### 17.8 Revoke Compromised API Key
1. `/settings/api-keys` → identify by prefix → "Revoke"
2. Create new key with same scopes
3. Update CI/CD pipelines
4. Review audit log: `/audit-log` filtered by `actor: api_key:{keyId}`

### 17.9 Disaster Recovery
**Back up:** Platform PostgreSQL, `/var/forjahost/`, `traefik-certs` volume, `.env` file.
**Recover:** New server → `install.sh` → restore `.env` → restore DB → restore `/var/forjahost/` → restore certs → `docker compose up -d` → verify all projects at `/projects`.

---

## 18. Comparison

| Cloud service | ForjaHost equivalent |
|--------------|---------------------|
| Render / Railway / Fly.io | Project deploy + domains |
| Vercel | Static/SPA deploy with nginx |
| Managed Postgres (Supabase, Neon) | Per-project Postgres + encrypted backups |
| Managed Redis (Upstash) | Per-project Redis container |
| S3 / Cloudflare R2 | Local storage volumes |
| GitHub Actions (deploy) | Webhook builds + API keys for CI/CD |
| Let's Encrypt (Certbot) | Traefik auto-SSL |
| Portainer | Dashboard UI + web terminal |
| Cron-job.org | Built-in cron job management |
| Better Uptime | Health monitoring + alerts |

**Cost:** Render ~$25-50/mo per project vs ForjaHost on EUR20/mo Hetzner VPS: unlimited projects within resource limits.