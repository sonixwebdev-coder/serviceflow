import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateModuleSizes, isProductionModule } from './check-module-size.js';

test('recognizes production modules and documented exclusions', () => {
  assert.equal(isProductionModule('apps/frontend/src/pages/Clients.jsx'), true);
  assert.equal(isProductionModule('apps/frontend/src/pages/Clients.test.jsx'), false);
  assert.equal(isProductionModule('apps/backend/src/__tests__/clients.test.js'), false);
  assert.equal(
    isProductionModule('apps/frontend/src/components/website-builder/templates/templateData.js'),
    false
  );
});

test('rejects new oversized modules and growth in an existing baseline', () => {
  const modules = new Map([
    ['apps/example/src/new.js', 501],
    ['apps/example/src/existing.js', 650],
  ]);
  const result = evaluateModuleSizes(modules, { 'apps/example/src/existing.js': 600 });

  assert.deepEqual(result.errors, [
    'apps/example/src/existing.js: grew from the 600-line baseline to 650 lines',
    'apps/example/src/new.js: 501 lines exceeds the 500-line limit',
  ]);
});

test('requires improved and completed modules to ratchet their baselines down', () => {
  const modules = new Map([
    ['apps/example/src/improved.js', 550],
    ['apps/example/src/completed.js', 500],
  ]);
  const result = evaluateModuleSizes(modules, {
    'apps/example/src/improved.js': 600,
    'apps/example/src/completed.js': 700,
  });

  assert.deepEqual(result.errors, [
    'apps/example/src/completed.js: now meets the line limit; remove its baseline entry',
    'apps/example/src/improved.js: improved from 600 to 550 lines; lower its baseline to keep the gain',
  ]);
});
