import assert from 'node:assert/strict';
import test from 'node:test';

import { createIntegrationEnvironment, parsePublishedPort } from './run-integration-tests.js';

test('extracts Docker-published ports from IPv4 and IPv6 output', () => {
  assert.equal(parsePublishedPort('0.0.0.0:49153'), 49153);
  assert.equal(parsePublishedPort('[::]:49154\n'), 49154);
});

test('rejects malformed Docker port output', () => {
  assert.throws(() => parsePublishedPort('postgres is not published'), /Could not parse/);
});

test('creates an isolated test environment without retaining database endpoints', () => {
  const environment = createIntegrationEnvironment(
    {
      DATABASE_URL: 'postgresql://shared.example.invalid/production',
      REDIS_URL: 'redis://shared.example.invalid:6379',
      NODE_ENV: 'production',
      PATH: '/usr/bin',
    },
    49153,
    49154
  );

  assert.equal(
    environment.DATABASE_URL,
    'postgresql://serviceflow:integration-only@127.0.0.1:49153/serviceflow_test?schema=public'
  );
  assert.equal(environment.REDIS_URL, 'redis://127.0.0.1:49154');
  assert.equal(environment.NODE_ENV, 'test');
  assert.equal(environment.PATH, '/usr/bin');
});
