import assert from 'node:assert/strict';
import test from 'node:test';

import {
  credentialLikeValues,
  documentedVariables,
  extractComposeReferences,
  extractDockerfileReferences,
  extractJavaScriptReferences,
  extractShellReferences,
} from './check-env-example.js';

test('extracts static JavaScript environment references and ignores Vite built-ins', () => {
  const references = extractJavaScriptReferences(`
    process.env.DATABASE_URL;
    process.env['REDIS_URL'];
    import.meta.env.VITE_API_URL;
    import.meta.env.MODE;
  `);

  assert.deepEqual([...references].sort(), ['DATABASE_URL', 'REDIS_URL', 'VITE_API_URL']);
});

test('extracts Compose interpolation with supported modifiers', () => {
  const references = extractComposeReferences(`
    user: \${POSTGRES_USER:-serviceflow}
    password: \${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is required}
    escaped: $\${NOT_AN_ENV_REFERENCE}
  `);

  assert.deepEqual([...references].sort(), ['POSTGRES_PASSWORD', 'POSTGRES_USER']);
});

test('extracts external shell variables without treating local variables as configuration', () => {
  const references = extractShellReferences(`
    STORAGE_DIR=/tmp/storage
    output=\${SERVICEFLOW_API_URL:-http://localhost:5000/api}
    printf '%s' "$STORAGE_DIR" "$PLATFORM_NAME"
  `);

  assert.deepEqual([...references].sort(), ['PLATFORM_NAME', 'SERVICEFLOW_API_URL']);
});

test('extracts configurable Docker build and environment variables', () => {
  const references = extractDockerfileReferences(`
    ARG VITE_API_URL=http://localhost:5000/api
    ENV VITE_API_URL=$VITE_API_URL
  `);

  assert.deepEqual([...references], ['VITE_API_URL']);
});

test('reports malformed, duplicate, and credential-shaped example values', () => {
  const parsed = documentedVariables(`
    API_URL=http://localhost:5000
    API_URL=http://localhost:5001
    JWT_ACCESS_SECRET=not-a-real-secret
    INVALID LINE
  `);

  assert.deepEqual(parsed.duplicates, ['API_URL']);
  assert.deepEqual(parsed.malformedLines, [5]);
  assert.deepEqual(credentialLikeValues(parsed.values), ['JWT_ACCESS_SECRET']);
});
