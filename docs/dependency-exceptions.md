# Dependency audit exceptions

Exceptions are temporary, evidence-based, and must be removed or renewed before their expiry date.

## Active exceptions

### ESLint 9

- **Packages:** `eslint@9.39.5`, `@eslint/js@9.39.5`
- **Reason:** the current `eslint-plugin-react@7.37.5` peer range excludes ESLint 10. Upgrading
  ESLint alone makes clean installs fail with an invalid peer-dependency tree.
- **Risk:** this is a tooling-only compatibility hold; the installed ESLint 9 release has no known
  npm audit advisory.
- **Owner:** repository maintainers
- **Review by:** 2026-10-21
- **Removal condition:** upgrade both packages after `eslint-plugin-react` publishes ESLint 10
  support and the full lint/test suite passes.

ExcelJS 4.4.0 still declares legacy ranges for `uuid` and `unzipper`. Root npm overrides select
`uuid@11.1.1` and `unzipper@0.12.5`; Excel workbook generation and streaming-reader compatibility
are covered by backend regression tests. Remove the overrides when a future ExcelJS release adopts
maintained versions directly.

CI rejects moderate, high, and critical dependency advisories. Any future exception must document
reachability evidence, an owner, and an expiry date here.
