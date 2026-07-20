# Branding and distributions

ServiceFlow is the upstream default. A distribution may override platform identity at deployment time while retaining the same API, database, and URL contracts.

## Runtime identity

Configure `PLATFORM_NAME`, `PLATFORM_URL`, and `PLATFORM_CONTACT_EMAIL` for the API and all static containers. Configure the `SERVICEFLOW_*` application URLs for links between applications. See [configuration.md](configuration.md).

Browser applications merge settings in this order:

1. Shared ServiceFlow defaults
2. `VITE_*` build values
3. `window.__SERVICEFLOW_CONFIG__` runtime values

This allows one image to move between environments without rebuilding it. The supplied nginx
entrypoint also applies runtime platform identity and application origins to the initial document
title, metadata, and canonical links before the application hydrates. Compose forwards the same
platform identity into static builds so prerendered public routes use the selected distribution
name.

## Organization branding

Organization logos, colors, public-site content, contact details, and PDF identity remain organization settings. They should not be replaced with platform contact information when organization data exists.

## Trademarks and legal pages

The AGPL license covers source code, not third-party trademarks or hosted-service commitments. Forks should use their own name, logo, domains, legal operator details, support policy, and external-service links. Legal and privacy text is a starting point only and must be reviewed for each operator and jurisdiction.

For the relationship between upstream ServiceFlow and the commercial ForjaIt distribution, see [../ATTRIBUTION.md](../ATTRIBUTION.md).
