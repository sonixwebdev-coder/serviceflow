# Configuration

Copy `.env.example` to `.env` and replace all example secrets. `npm run env:check` verifies
JavaScript, Compose, Dockerfile, and shell-script references against the root template. It also
checks every repository `.env.example` for malformed or duplicate assignments, undocumented
application overrides, and credential-shaped values.

## Required API settings

| Variable             | Purpose                                                 |
| -------------------- | ------------------------------------------------------- |
| `NODE_ENV`           | `development`, `test`, or `production`                  |
| `DATABASE_URL`       | PostgreSQL connection URL                               |
| `JWT_ACCESS_SECRET`  | Access-token signing secret                             |
| `JWT_REFRESH_SECRET` | Refresh-token signing secret                            |
| `CSRF_SECRET`        | CSRF token secret                                       |
| `ENCRYPTION_KEY`     | Production encryption key, at least 32 characters       |
| `CORS_ORIGINS`       | Comma-separated browser origins; required in production |
| `FRONTEND_URL`       | CRM application URL; required in production             |
| `CLIENT_PORTAL_URL`  | Client portal URL; required in production               |
| `WEBSITE_BASE_URL`   | Base URL for path-based public sites                    |

For subdomain sites, set `WEBSITE_URL_TEMPLATE=https://{subdomain}.example.com` instead of `WEBSITE_BASE_URL`. The template must contain `{subdomain}`.

## Production Compose database settings

`docker-compose.prod.yml` builds its internal `DATABASE_URL` from `POSTGRES_USER`,
`POSTGRES_PASSWORD`, and `POSTGRES_DB`. The example password is intentionally blank: set a unique
value before starting the production stack. These Compose variables are separate from the
disposable PostgreSQL credentials used by the local development Compose file.

## Platform identity

| Variable                 | Default                 | Purpose                                |
| ------------------------ | ----------------------- | -------------------------------------- |
| `PLATFORM_NAME`          | `ServiceFlow`           | API, email, PDF, and platform identity |
| `PLATFORM_URL`           | `http://localhost:5173` | Public platform link                   |
| `PLATFORM_CONTACT_EMAIL` | `contact@example.com`   | Default platform contact               |

## Static application runtime settings

The Docker images map these values into `window.__SERVICEFLOW_CONFIG__`:

- `SERVICEFLOW_API_URL`
- `SERVICEFLOW_SOCKET_URL`
- `SERVICEFLOW_APP_URL`
- `SERVICEFLOW_PORTAL_URL`
- `SERVICEFLOW_WEBSITE_URL`
- `SERVICEFLOW_ADMIN_URL`
- `PLATFORM_NAME`, `PLATFORM_URL`, and `PLATFORM_CONTACT_EMAIL`

Equivalent `VITE_*` variables are build-time fallbacks for non-container deployments. Runtime values take precedence.

## Optional integrations

The example file documents Stripe billing, Google OAuth/Calendar, Brevo or SMTP email, Sentry, Web
Push, file storage, optional regular/bold PDF font paths, and company/PDF identity. Leave an
integration unset when it is not used. Configure webhook URLs and provider dashboards to match the
public API URL.

## ForjaIt distribution example

The commercial distribution can preserve its identity without modifying engine source:

```env
PLATFORM_NAME=ForjaIt
PLATFORM_URL=https://your-forjait-deployment.example
PLATFORM_CONTACT_EMAIL=support@your-domain.example
WEBSITE_URL_TEMPLATE=https://{subdomain}.your-domain.example
```

Set all application, CORS, email, payment, legal, and runtime URLs to the actual deployment values. The example domains above are intentionally non-operational.
