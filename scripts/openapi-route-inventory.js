import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

export const HTTP_METHODS = Object.freeze(['get', 'post', 'put', 'patch', 'delete']);

const routePattern = (receiver) =>
  new RegExp(`\\b${receiver}\\.(${HTTP_METHODS.join('|')})\\s*\\(\\s*(['"])([^'"\\n]+)\\2`, 'g');

const mountPattern = (receiver) =>
  new RegExp(`\\b${receiver}\\.use\\(\\s*(['"])([^'"]+)\\1\\s*,([^;]*?)\\);`, 'gs');

const requirePattern = /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)\s*;/g;

export const maskJavaScriptComments = (source) => {
  const output = source.split('');
  let quote = null;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (quote) {
      if (character === '\\') index += 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "'" || character === '"' || character === '`') {
      quote = character;
      continue;
    }
    if (character === '/' && next === '/') {
      output[index] = ' ';
      output[index + 1] = ' ';
      index += 2;
      while (index < source.length && source[index] !== '\n') {
        output[index] = ' ';
        index += 1;
      }
      index -= 1;
      continue;
    }
    if (character === '/' && next === '*') {
      output[index] = ' ';
      output[index + 1] = ' ';
      index += 2;
      while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
        if (source[index] !== '\n') output[index] = ' ';
        index += 1;
      }
      if (index < source.length) {
        output[index] = ' ';
        output[index + 1] = ' ';
        index += 1;
      }
    }
  }

  return output.join('');
};

export const normalizeExpressPath = (path) => {
  const normalized = `/${path}`.replace(/\/{2,}/g, '/').replace(/\/:([A-Za-z_][\w]*)/g, '/{$1}');
  return normalized.length > 1 ? normalized.replace(/\/$/, '') : normalized;
};

export const joinRoutePaths = (prefix, routePath) =>
  normalizeExpressPath(`${prefix === '/' ? '' : prefix}/${routePath === '/' ? '' : routePath}`);

export const extractRouteCalls = (source, receiver = 'router') => {
  const operations = [];
  const searchableSource = maskJavaScriptComments(source);
  for (const match of searchableSource.matchAll(routePattern(receiver))) {
    operations.push({
      method: match[1],
      path: match[3],
      line: source.slice(0, match.index).split('\n').length,
    });
  }
  return operations;
};

const resolveModule = (sourceFile, request) => {
  if (!request.startsWith('.')) return null;
  const candidate = resolve(dirname(sourceFile), request);
  const choices = [candidate, `${candidate}.js`, resolve(candidate, 'index.js')];
  return choices.find((choice) => existsSync(choice) && statSync(choice).isFile()) || null;
};

const extractRequiredModules = (source, sourceFile) => {
  const required = new Map();
  for (const match of maskJavaScriptComments(source).matchAll(requirePattern)) {
    const resolvedModule = resolveModule(sourceFile, match[2]);
    if (resolvedModule) required.set(match[1], resolvedModule);
  }
  return required;
};

export const extractRouterMounts = (source, sourceFile, receiver = 'router') => {
  const required = extractRequiredModules(source, sourceFile);
  const mounts = [];
  const searchableSource = maskJavaScriptComments(source);

  for (const match of searchableSource.matchAll(mountPattern(receiver))) {
    const identifiers = match[3].match(/[A-Za-z_$][\w$]*/g) || [];
    const routerModules = [...new Set(identifiers.filter((name) => required.has(name)))];
    if (routerModules.length === 0) continue;
    if (routerModules.length > 1) {
      throw new Error(
        `${sourceFile}:${source.slice(0, match.index).split('\n').length} mounts multiple required modules`
      );
    }
    mounts.push({
      prefix: match[2],
      sourceFile: required.get(routerModules[0]),
      line: source.slice(0, match.index).split('\n').length,
    });
  }

  return mounts;
};

const collectRouterOperations = ({ sourceFile, prefix, repositoryRoot, ancestors = [] }) => {
  if (ancestors.includes(sourceFile)) {
    throw new Error(`Router mount cycle: ${[...ancestors, sourceFile].join(' -> ')}`);
  }

  const source = readFileSync(sourceFile, 'utf8');
  const sourcePath = relative(repositoryRoot, sourceFile).replaceAll('\\', '/');
  const operations = extractRouteCalls(source).map((operation) => ({
    ...operation,
    path: joinRoutePaths(prefix, operation.path),
    source: sourcePath,
  }));

  for (const mount of extractRouterMounts(source, sourceFile)) {
    operations.push(
      ...collectRouterOperations({
        sourceFile: mount.sourceFile,
        prefix: joinRoutePaths(prefix, mount.prefix),
        repositoryRoot,
        ancestors: [...ancestors, sourceFile],
      })
    );
  }

  return operations;
};

export const operationKey = ({ method, path }) => `${method.toUpperCase()} ${path}`;

export const collectRegisteredOperations = (repositoryRoot) => {
  const serverFile = resolve(repositoryRoot, 'apps/backend/server.js');
  const apiDirectory = resolve(repositoryRoot, 'apps/backend/src/api');
  const serverSource = readFileSync(serverFile, 'utf8');
  const operations = extractRouteCalls(serverSource, 'app').map((operation) => ({
    ...operation,
    path: normalizeExpressPath(operation.path),
    source: relative(repositoryRoot, serverFile).replaceAll('\\', '/'),
  }));

  for (const mount of extractRouterMounts(serverSource, serverFile, 'app')) {
    if (!mount.sourceFile.startsWith(`${apiDirectory}/`) && mount.sourceFile !== apiDirectory)
      continue;
    operations.push(
      ...collectRouterOperations({
        sourceFile: mount.sourceFile,
        prefix: normalizeExpressPath(mount.prefix),
        repositoryRoot,
      })
    );
  }

  const duplicates = new Map();
  for (const operation of operations) {
    const key = operationKey(operation);
    if (!duplicates.has(key)) duplicates.set(key, []);
    duplicates.get(key).push(`${operation.source}:${operation.line}`);
  }
  const duplicateRoutes = [...duplicates].filter(([, sources]) => sources.length > 1);
  if (duplicateRoutes.length > 0) {
    throw new Error(
      `Duplicate registered routes:\n${duplicateRoutes
        .map(([key, sources]) => `${key}: ${sources.join(', ')}`)
        .join('\n')}`
    );
  }

  return operations.sort((left, right) => operationKey(left).localeCompare(operationKey(right)));
};
