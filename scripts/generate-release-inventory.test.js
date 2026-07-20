import assert from 'node:assert/strict';
import test from 'node:test';

import { createLicenseInventory, normalizeSbom } from './generate-release-inventory.js';

test('normalizes volatile SBOM fields and ordering', () => {
  const normalized = normalizeSbom({
    serialNumber: 'urn:uuid:volatile',
    metadata: { timestamp: '2026-01-01T00:00:00.000Z', tools: [{ name: 'npm' }] },
    components: [
      { 'bom-ref': 'z@1.0.0', name: 'z', licenses: [{ license: { id: 'MIT' } }] },
      { 'bom-ref': 'a@1.0.0', name: 'a', licenses: [{ license: { id: 'ISC' } }] },
    ],
  });

  assert.equal(normalized.serialNumber, undefined);
  assert.equal(normalized.metadata.timestamp, undefined);
  assert.deepEqual(
    normalized.components.map((component) => component['bom-ref']),
    ['a@1.0.0', 'z@1.0.0']
  );
});

test('builds a sorted inventory and applies explicit legacy metadata overrides', () => {
  const inventory = createLicenseInventory(
    {
      components: [
        { 'bom-ref': 'legacy@1.0.0', name: 'legacy', version: '1.0.0' },
        {
          'bom-ref': 'declared@2.0.0',
          name: 'declared',
          version: '2.0.0',
          licenses: [{ license: { id: 'MIT' } }],
        },
      ],
    },
    { 'legacy@1.0.0': { licenses: ['ISC'], evidence: 'test override' } }
  );

  assert.equal(inventory.componentCount, 2);
  assert.deepEqual(inventory.licenseCounts, { ISC: 1, MIT: 1 });
  assert.deepEqual(
    inventory.components.map((component) => component.reference),
    ['declared@2.0.0', 'legacy@1.0.0']
  );
  assert.equal(inventory.components[1].evidence, 'test override');
});

test('rejects newly missing license metadata', () => {
  assert.throws(
    () =>
      createLicenseInventory(
        { components: [{ 'bom-ref': 'unknown@1.0.0', name: 'unknown', version: '1.0.0' }] },
        {}
      ),
    /License metadata is missing.*unknown@1\.0\.0/
  );
});
