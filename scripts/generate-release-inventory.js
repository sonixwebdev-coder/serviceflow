import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = resolve(repositoryRoot, 'build/release');

export const LICENSE_OVERRIDES = Object.freeze({
  'busboy@1.6.0': { licenses: ['MIT'], evidence: 'legacy package licenses metadata' },
  'cldrjs@0.5.5': { licenses: ['MIT'], evidence: 'bundled LICENSE-MIT file' },
  'globalize@0.1.1': { licenses: ['MIT'], evidence: 'legacy package licenses metadata' },
  'streamsearch@1.1.0': { licenses: ['MIT'], evidence: 'legacy package licenses metadata' },
  'url-template@2.0.8': {
    licenses: ['BSD-3-Clause'],
    evidence: 'legacy BSD package metadata and bundled license text',
  },
  'xmlhttprequest-ssl@2.1.2': {
    licenses: ['MIT'],
    evidence: 'legacy package licenses metadata',
  },
});

const compareJson = (left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right));

export const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue).sort(compareJson);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableValue(value[key])])
  );
};

export const normalizeSbom = (source) => {
  const normalized = structuredClone(source);
  delete normalized.serialNumber;
  if (normalized.metadata) delete normalized.metadata.timestamp;
  return stableValue(normalized);
};

const licenseValues = (component) =>
  [
    ...new Set(
      (component.licenses || [])
        .map((entry) => entry.expression || entry.license?.id || entry.license?.name)
        .filter(Boolean)
    ),
  ].sort();

export const createLicenseInventory = (sbom, overrides = LICENSE_OVERRIDES) => {
  const unresolved = [];
  const components = (sbom.components || [])
    .map((component) => {
      const reference = component['bom-ref'];
      let licenses = licenseValues(component);
      let evidence = 'npm CycloneDX metadata';

      if (licenses.length === 0 && overrides[reference]) {
        licenses = [...overrides[reference].licenses].sort();
        evidence = overrides[reference].evidence;
      }
      if (licenses.length === 0) unresolved.push(reference || component.name || '<unknown>');

      return {
        name: component.group ? `${component.group}/${component.name}` : component.name,
        version: component.version,
        reference,
        licenses,
        evidence,
      };
    })
    .sort((left, right) => left.reference.localeCompare(right.reference));

  if (unresolved.length > 0) {
    throw new Error(
      `License metadata is missing for ${unresolved.length} component(s): ${unresolved.sort().join(', ')}`
    );
  }

  const licenseCounts = {};
  for (const component of components) {
    for (const license of component.licenses) {
      licenseCounts[license] = (licenseCounts[license] || 0) + 1;
    }
  }

  return stableValue({
    schemaVersion: 1,
    source: 'npm sbom --package-lock-only --omit=dev --sbom-format=cyclonedx',
    scope: 'production dependencies and workspaces',
    componentCount: components.length,
    licenseCounts,
    components,
  });
};

const generateNpmSbom = () => {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    throw new Error('Run this generator through an npm script so the pinned npm CLI is used.');
  }

  const result = spawnSync(
    process.execPath,
    [npmCli, 'sbom', '--package-lock-only', '--omit=dev', '--sbom-format=cyclonedx'],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: { ...process.env, npm_config_update_notifier: 'false' },
      maxBuffer: 50 * 1024 * 1024,
    }
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`npm sbom failed with exit code ${result.status}: ${result.stderr.trim()}`);
  }

  return JSON.parse(result.stdout);
};

const writeJson = (filePath, value) => {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

export const generateReleaseInventory = ({ sbom = true, licenses = true } = {}) => {
  const normalizedSbom = normalizeSbom(generateNpmSbom());
  const licenseInventory = createLicenseInventory(normalizedSbom);

  if (sbom) writeJson(resolve(outputDirectory, 'serviceflow.cdx.json'), normalizedSbom);
  if (licenses) {
    writeJson(resolve(outputDirectory, 'serviceflow.dependency-licenses.json'), licenseInventory);
  }

  return {
    componentCount: licenseInventory.componentCount,
    sbomPath: sbom ? 'build/release/serviceflow.cdx.json' : null,
    licensePath: licenses ? 'build/release/serviceflow.dependency-licenses.json' : null,
  };
};

const isMainModule = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  const flags = new Set(process.argv.slice(2));
  const supportedFlags = new Set(['--sbom-only', '--licenses-only']);
  const unsupported = [...flags].filter((flag) => !supportedFlags.has(flag));

  if (unsupported.length > 0 || (flags.has('--sbom-only') && flags.has('--licenses-only'))) {
    console.error(
      'Usage: node scripts/generate-release-inventory.js [--sbom-only|--licenses-only]'
    );
    process.exitCode = 1;
  } else {
    try {
      const result = generateReleaseInventory({
        sbom: !flags.has('--licenses-only'),
        licenses: !flags.has('--sbom-only'),
      });
      const outputs = [result.sbomPath, result.licensePath].filter(Boolean).join(', ');
      console.log(`Release inventory generated (${result.componentCount} components): ${outputs}`);
    } catch (error) {
      console.error(`Release inventory failed: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
