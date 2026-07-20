# API contract and route coverage

The maintained OpenAPI 3.1 document is [openapi.json](openapi.json). It catalogs the REST surface
registered by `apps/backend/server.js` and its mounted routers under `apps/backend/src/api` without
changing the runtime routes.

Every operation declares `x-serviceflow-contract-status`:

- `characterized` means the operation includes reviewed request, response, or error details.
- `route-only` means the method, URL, and path parameters are registered and tracked, while its
  legacy payload schemas still need characterization. The `default` response deliberately avoids
  asserting an unverified status code or response shape.

The current catalog contains 361 registered operations across 299 paths. Twenty-seven health,
authentication, public booking, public website, contact, pricing, and location operations are
characterized; 334 legacy operations are route-only. Route coverage is therefore complete, while
payload-schema coverage remains incremental.

## Validate and synchronize

```bash
npm run openapi:validate
npm run openapi:sync
```

Validation resolves the router mount graph, converts Express `:parameter` paths to OpenAPI
`{parameter}` paths, and fails for:

- registered operations missing from the specification;
- documented operations that are no longer registered;
- duplicate operation identifiers;
- malformed paths, path parameters, response keys, tags, or internal references; and
- operations missing an explicit contract-status classification.

Synchronization preserves existing characterized operations and adds deterministic route-only
entries for newly registered routes. Review the generated entry rather than treating
`openapi:sync` as payload documentation. When request and response behavior has been verified,
replace the generic response with accurate schemas and change the status to `characterized`.

The static inventory recognizes literal `app` and `router` calls using `get`, `post`, `put`,
`patch`, and `delete`, plus literal mounted-router prefixes. A future dynamic route-registration
mechanism must extend the inventory parser and its tests in the same change.
