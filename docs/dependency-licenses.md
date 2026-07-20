# Dependency license inventory

ServiceFlow generates release-time dependency inventories from the pinned root lockfile and npm
11's built-in CycloneDX output. Generated files are build artifacts and are not committed.

```bash
npm run release:inventory
```

The command writes the following deterministic, production-scope files under `build/release/`:

- `serviceflow.cdx.json` — normalized CycloneDX SBOM
- `serviceflow.dependency-licenses.json` — one license record per production dependency and
  workspace

Use `npm run release:sbom` or `npm run release:licenses` when only one artifact is needed. The
generator removes the volatile SBOM timestamp and serial number, sorts the output, and fails when a
new dependency lacks license metadata.

## Legacy metadata normalization

Some transitive packages publish legacy `licenses` fields or non-SPDX aliases that npm does not
include in its CycloneDX license field. The generator records explicit normalizations for
`busboy@1.6.0`, `globalize@0.1.1`, `streamsearch@1.1.0`, `url-template@2.0.8`, and
`xmlhttprequest-ssl@2.1.2` based on their package metadata and bundled license text.

The maintained `unzipper` compatibility override removes ExcelJS's former dependency path through
`buffers@0.1.1`, so every current production component has affirmative license metadata or a
documented metadata normalization.
