# Changelog

All notable project changes will be documented here. The format follows Keep a Changelog, and releases will use semantic versioning once the first public version is tagged.

## [Unreleased]

### Added

- Node 24/npm 11 monorepo workspace covering all five applications and shared packages.
- Shared runtime platform configuration with ServiceFlow defaults and deployment overrides.
- Repository-wide formatting, linting, environment coverage, and baseline application tests.
- Deterministic CycloneDX SBOM, dependency-license inventory, and production module-size ratchet.
- Disposable PostgreSQL/Redis integration harness with migration, persistence, cache, and readiness checks.
- Complete REST route catalog with deterministic OpenAPI synchronization and route/spec parity checks.
- Reviewed OpenAPI request, response, pagination, and error contracts for all location operations.
- Enforced 500 kB production JavaScript chunk budget across all browser applications.
- Public licensing, contribution, conduct, support, security, attribution, and operator documentation.

### Changed

- Consolidated dependency installation into one root lockfile.
- Split large browser routes and removed full-catalog icon imports to keep production chunks below the warning threshold.
- Split service-order, billing, client-import, appointment-message, chat-attachment, task, and push-notification backend modules behind their existing public façades.
- Split the CRM dashboard shell and client-portal profile and landing pages into focused, tested components while preserving their routes and responsive behavior.
- Replaced legacy ExcelJS transitive packages with tested compatibility overrides and removed all current npm audit findings.
- Moved Prisma CLI settings from deprecated package metadata to `prisma.config.ts`.
- Normalized backend image source permissions and added a build-time non-root module-load check.
- Replaced reusable commercial-brand defaults with configurable ServiceFlow identity.

### Removed

- Private product specifications, sales pitches, and vendor-specific deployment documentation from the public documentation set.
