# Architecture

ServiceFlow is a single repository containing one Node.js API, four React applications, a shared runtime-config package, and one Prisma schema.

```text
CRM (5173) ───────────────┐
Client portal (5174) ─────┤
Website renderer (5175) ──┼── HTTP / Socket.IO ── Backend (5000)
Platform admin (5176) ────┘                         ├── PostgreSQL
                                                    ├── Redis
                                                    └── configured email/payment providers
```

## Application boundaries

- `apps/backend` owns HTTP routing, authentication, tenant-aware business services, realtime events, scheduled jobs, exports, and integrations.
- `apps/frontend` is the organization workspace for CRM and operational workflows.
- `apps/client-portal` is the customer-facing booking, marketplace, invoice, loyalty, and messaging experience.
- `apps/website` renders organization-authored public pages and booking flows.
- `apps/admin` operates platform-wide organizations, billing, support, settings, logs, and maintenance.
- `packages/runtime-config` merges public ServiceFlow defaults, Vite build-time fallbacks, and container-start runtime values.
- `prisma/schema.prisma` and `prisma/migrations` define the shared persistence contract.

## Request and tenant model

Authenticated API requests establish an identity before tenant and location scope are attached. Routes call services through the request's tenant-aware Prisma client. Platform-administration routes use separate super-admin authentication and authorization. Public website and booking routes resolve an organization from a public slug or site identifier.

The database is shared across tenants, so every new query and realtime event must preserve organization boundaries. Add integration coverage whenever a change affects identity, tenancy, location scoping, or cross-organization identifiers.

## Runtime configuration

Static applications are built once. At container startup nginx generates `/serviceflow-config.js`, which assigns `window.__SERVICEFLOW_CONFIG__`. Each app merges those runtime values over its `VITE_*` build fallback and the shared ServiceFlow defaults. The API uses regular environment variables.

## Storage and external systems

- PostgreSQL stores application and tenant data.
- Redis supports caching, distributed rate limits, presence, and realtime behavior; production deployments should treat it as required.
- Uploaded files use `FILE_STORAGE_ROOT`; Docker mounts a persistent backend volume.
- Stripe, Google, Brevo/SMTP, Sentry, and Web Push are optional and activate only when configured.

## Compatibility

Public REST routes, response shapes, Prisma semantics, stored data, and public URL structures are compatibility boundaries. Prefer additive fields and adapters. Database changes require a forward migration, upgrade notes, and a tested empty-install and upgrade path.
