import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractRouteCalls,
  extractRouterMounts,
  joinRoutePaths,
  maskJavaScriptComments,
  normalizeExpressPath,
} from './openapi-route-inventory.js';

test('extracts literal Express operations and source lines', () => {
  const operations = extractRouteCalls(`
router.get('/clients', handler);
router.patch(
  '/clients/:clientId',
  handler
);
// router.delete('/clients/:clientId', disabledHandler);
/* router.post('/disabled', disabledHandler); */
`);

  assert.deepEqual(operations, [
    { method: 'get', path: '/clients', line: 2 },
    { method: 'patch', path: '/clients/:clientId', line: 3 },
  ]);
});

test('masks comments without changing source positions or quoted comment markers', () => {
  const source = "const url = 'https://example.com'; // disabled\nrouter.get('/active', handler);";
  const masked = maskJavaScriptComments(source);

  assert.equal(masked.length, source.length);
  assert.match(masked, /https:\/\/example\.com/);
  assert.doesNotMatch(masked, /disabled/);
  assert.equal(extractRouteCalls(source)[0].line, 2);
});

test('normalizes Express parameters and joins mounted paths', () => {
  assert.equal(
    normalizeExpressPath('/appointments/:appointmentId'),
    '/appointments/{appointmentId}'
  );
  assert.equal(
    joinRoutePaths('/api/portal', '/appointments/:id/'),
    '/api/portal/appointments/{id}'
  );
  assert.equal(joinRoutePaths('/', '/'), '/');
});

test('resolves mounted router modules while ignoring middleware-only mounts', () => {
  const source = `
const clientsRouter = require('./clients');
router.use(authenticate);
router.use('/clients', authenticate, clientsRouter);
`;

  // The resolver intentionally requires a real file, so use this module as a stable fixture.
  const mounts = extractRouterMounts(
    source.replace("require('./clients')", "require('./openapi-route-inventory.test')"),
    new URL('./index.js', import.meta.url).pathname
  );
  assert.equal(mounts.length, 1);
  assert.equal(mounts[0].prefix, '/clients');
  assert.match(mounts[0].sourceFile, /openapi-route-inventory\.test\.js$/);
});
