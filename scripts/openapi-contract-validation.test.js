import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectDocumentedOperations,
  validateOperationContractStatus,
  validatePathItemShape,
  validateRouteCoverage,
} from './openapi-contract-validation.js';

test('detects registered operations missing from OpenAPI and stale documented operations', () => {
  const documented = collectDocumentedOperations({
    paths: {
      '/stale': { get: { operationId: 'getStale' } },
      '/current': { post: { operationId: 'postCurrent' } },
    },
  });
  const errors = validateRouteCoverage(documented, [
    { method: 'post', path: '/current', source: 'api.js', line: 10 },
    { method: 'get', path: '/missing', source: 'api.js', line: 20 },
  ]);

  assert.deepEqual(errors, [
    'GET /missing is registered at api.js:20 but undocumented',
    'GET /stale is documented but not registered by the backend',
  ]);
});

test('detects invalid path and method shapes', () => {
  const result = validatePathItemShape('api/clients/:clientId', {
    fetch: { operationId: 'fetchClient' },
  });

  assert.deepEqual(result.parameterNames, []);
  assert.deepEqual(result.errors, [
    'OpenAPI path must start with /: api/clients/:clientId',
    'OpenAPI path must use {parameter} syntax: api/clients/:clientId',
    'api/clients/:clientId contains unsupported path-item field fetch',
  ]);
});

test('accepts standard methods and well-formed path parameters', () => {
  const result = validatePathItemShape('/api/clients/{clientId}', {
    parameters: [],
    get: { operationId: 'getClient' },
    'x-serviceflow-note': 'tracked',
  });

  assert.deepEqual(result, { errors: [], parameterNames: ['clientId'] });
});

test('requires characterized operations to replace generic route-only responses', () => {
  assert.deepEqual(
    validateOperationContractStatus('GET /api/locations', {
      description: 'Detailed location contract',
      responses: { default: { description: 'Unverified' } },
      'x-serviceflow-contract-status': 'characterized',
    }),
    [
      'GET /api/locations characterized entry must declare at least one explicit response status',
      'GET /api/locations characterized entry must not retain a generic default response',
    ]
  );
  assert.deepEqual(
    validateOperationContractStatus('GET /api/locations', {
      responses: { 200: { description: 'Locations' } },
      'x-serviceflow-contract-status': 'characterized',
    }),
    []
  );
});
