# Troubleshooting

## Environment validation fails

Run `npm run env:check`, compare `.env` with `.env.example`, and then start the API to see production-only validation errors. Empty optional provider variables are valid; required secrets must be replaced with non-example values.

## Prisma cannot load OpenSSL

Use the supplied backend image or install OpenSSL in the Node runtime. Regenerate the Prisma client after changing platforms:

```bash
npm run prisma:generate --workspace apps/backend
```

## Database connection or migration errors

Confirm that `DATABASE_URL` resolves from the process/container running the API. In Compose, the database host is `postgres`, not `localhost`. Check migration status before applying changes and do not repair a shared database by deleting migrations.

## Redis is unavailable

Check `REDIS_URL`, DNS, and credentials. Development can operate with reduced behavior, but production rate limiting, caching, presence, and realtime consistency expect a reachable Redis instance.

## Browser requests are blocked

Ensure the exact browser origins are present in `CORS_ORIGINS`, without paths, and that public API/runtime URLs use the same HTTPS deployment. Check the reverse proxy's WebSocket upgrade configuration for Socket.IO failures.

## Runtime branding or URLs do not update

Open `/serviceflow-config.js` in the affected static application and verify that container environment values were rendered. The response should not be cached. Build-time `VITE_*` values are only fallbacks.

## Public-site links are wrong

Use `WEBSITE_BASE_URL=https://sites.example.com` for path routing or `WEBSITE_URL_TEMPLATE=https://{subdomain}.example.com` for subdomain routing. Configure the frontend's `SERVICEFLOW_WEBSITE_URL` consistently with the deployed renderer.

## Tests behave differently from the host

The supported toolchain is Node 24/npm 11. Run checks in the same versions or use a Node 24
container. Integration tests require Docker with Compose v2; the test command provisions and
removes its own disposable PostgreSQL and Redis services.
