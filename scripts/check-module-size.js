import { readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PRODUCTION_MODULE_LINE_LIMIT = 500;
const supportedExtensions = new Set(['.cjs', '.js', '.jsx', '.mjs', '.ts', '.tsx']);
const ignoredDirectories = new Set(['__tests__', 'dist', 'node_modules', 'test']);

export function isProductionModule(relativePath) {
  const normalized = relativePath.replaceAll('\\', '/');
  const segments = normalized.split('/');
  if (!normalized.startsWith('apps/') || !segments.includes('src')) return false;
  if (segments.some((segment) => ignoredDirectories.has(segment))) return false;
  if (!supportedExtensions.has(extname(normalized))) return false;
  if (/\.(?:spec|test)\.[cm]?[jt]sx?$/.test(normalized)) return false;
  return !normalized.endsWith('/templateData.js');
}

const walk = (directory, repositoryRoot, modules = new Map()) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      walk(absolutePath, repositoryRoot, modules);
    } else if (entry.isFile()) {
      const modulePath = relative(repositoryRoot, absolutePath).replaceAll('\\', '/');
      if (isProductionModule(modulePath)) {
        const source = readFileSync(absolutePath, 'utf8');
        modules.set(modulePath, source.match(/\n/g)?.length || 0);
      }
    }
  }
  return modules;
};

export function evaluateModuleSizes(modules, baseline, lineLimit = PRODUCTION_MODULE_LINE_LIMIT) {
  const errors = [];
  const oversized = [...modules].filter(([, lineCount]) => lineCount > lineLimit);

  for (const [modulePath, lineCount] of oversized) {
    const expected = baseline[modulePath];
    if (expected === undefined) {
      errors.push(`${modulePath}: ${lineCount} lines exceeds the ${lineLimit}-line limit`);
    } else if (lineCount > expected) {
      errors.push(`${modulePath}: grew from the ${expected}-line baseline to ${lineCount} lines`);
    } else if (lineCount < expected) {
      errors.push(
        `${modulePath}: improved from ${expected} to ${lineCount} lines; lower its baseline to keep the gain`
      );
    }
  }

  for (const modulePath of Object.keys(baseline)) {
    const lineCount = modules.get(modulePath);
    if (lineCount === undefined)
      errors.push(`${modulePath}: stale baseline entry for a missing module`);
    else if (lineCount <= lineLimit) {
      errors.push(`${modulePath}: now meets the line limit; remove its baseline entry`);
    }
  }

  return { errors: errors.sort(), oversizedCount: oversized.length };
}

export function validateModuleSizes(repositoryRoot) {
  const baselinePath = resolve(repositoryRoot, 'scripts/module-size-baseline.json');
  const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
  const modules = walk(resolve(repositoryRoot, 'apps'), repositoryRoot);
  return evaluateModuleSizes(modules, baseline);
}

export function main(repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')) {
  const result = validateModuleSizes(repositoryRoot);
  if (result.errors.length) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log(
    `Production module-size ratchet passed (${result.oversizedCount} grandfathered modules remain).`
  );
}

const invokedPath = process.argv[1] && resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) main();
