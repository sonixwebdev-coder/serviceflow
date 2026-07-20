import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createOperationId,
  createRouteOnlyOperation,
  synchronizeOpenApiRoutes,
} from './sync-openapi-routes.js';

test('creates stable operation identifiers and required path parameters', () => {
  const route = { method: 'patch', path: '/api/clients/{clientId}/status' };
  const operation = createRouteOnlyOperation(route);

  assert.equal(createOperationId(route), 'patchApiClientsByClientIdStatus');
  assert.equal(operation['x-serviceflow-contract-status'], 'route-only');
  assert.deepEqual(operation.parameters, [
    {
      name: 'clientId',
      in: 'path',
      required: true,
      schema: { type: 'string' },
    },
  ]);
});

test('preserves characterized operations and adds missing registered routes', () => {
  const source = {
    paths: {
      '/health': {
        get: {
          operationId: 'getHealth',
          tags: ['Health'],
          responses: { 200: { description: 'Healthy' } },
        },
      },
    },
    tags: [{ name: 'Health', description: 'Health checks' }],
  };
  const result = synchronizeOpenApiRoutes(source, [
    { method: 'get', path: '/health' },
    { method: 'get', path: '/api/clients' },
  ]);

  assert.equal(result.added, 1);
  assert.equal(
    result.specification.paths['/health'].get['x-serviceflow-contract-status'],
    'characterized'
  );
  assert.equal(
    result.specification.paths['/api/clients'].get['x-serviceflow-contract-status'],
    'route-only'
  );
  assert.deepEqual(result.specification.tags, [
    { name: 'Clients' },
    { name: 'Health', description: 'Health checks' },
  ]);
});

test('rejects documented operations that are not registered', () => {
  assert.throws(
    () =>
      synchronizeOpenApiRoutes(
        {
          paths: {
            '/stale': {
              get: { operationId: 'getStale', responses: { 200: { description: 'Stale' } } },
            },
          },
        },
        []
      ),
    /not registered.*GET \/stale/
  );
});
