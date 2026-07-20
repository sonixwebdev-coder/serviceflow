import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';

import { inspectBundles } from './check-bundle-size.js';

test('reports missing builds and JavaScript chunks over the configured budget', () => {
  const repositoryRoot = mkdtempSync(resolve(tmpdir(), 'serviceflow-bundles-'));

  try {
    const assets = resolve(repositoryRoot, 'apps/example/dist/assets');
    mkdirSync(assets, { recursive: true });
    writeFileSync(resolve(assets, 'small.js'), 'a'.repeat(20));
    writeFileSync(resolve(assets, 'large.js'), 'b'.repeat(101));
    writeFileSync(resolve(assets, 'styles.css'), 'c'.repeat(1000));

    const result = inspectBundles(repositoryRoot, {
      applications: ['apps/example', 'apps/missing'],
      maximumBytes: 100,
    });

    assert.deepEqual(result.missing, ['apps/missing/dist']);
    assert.deepEqual(
      result.chunks.map(({ path, bytes }) => ({ path, bytes })),
      [
        { path: 'apps/example/dist/assets/large.js', bytes: 101 },
        { path: 'apps/example/dist/assets/small.js', bytes: 20 },
      ]
    );
    assert.deepEqual(result.oversized, [result.chunks[0]]);
  } finally {
    rmSync(repositoryRoot, { recursive: true, force: true });
  }
});
