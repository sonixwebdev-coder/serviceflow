import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';

import {
  collectRegisteredOperations,
  HTTP_METHODS,
  operationKey,
} from './openapi-route-inventory.js';

const repositoryRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const specificationPath = resolve(repositoryRoot, 'docs/openapi.json');

const titleCase = (value) =>
  value
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
    .join('');

export const createOperationId = ({ method, path }) => {
  const parts = path
    .split('/')
    .filter(Boolean)
    .map((part) => {
      const parameter = part.match(/^\{([^}]+)\}$/);
      return parameter ? `By${titleCase(parameter[1])}` : titleCase(part);
    });
  return `${method}${parts.join('') || 'Root'}`;
};

const tagForPath = (path) => {
  const firstSegment = path
    .split('/')
    .filter(Boolean)
    .find((segment) => segment !== 'api');
  const tag = titleCase(firstSegment || 'Platform').replace(/([a-z])([A-Z])/g, '$1 $2');
  if (tag === 'Auth') return 'Authentication';
  if (tag === 'Sites') return 'Public websites';
  return tag;
};

export const createRouteOnlyOperation = (operation) => {
  const parameters = [...operation.path.matchAll(/\{([^}]+)\}/g)].map((match) => ({
    name: match[1],
    in: 'path',
    required: true,
    schema: { type: 'string' },
  }));

  return {
    operationId: createOperationId(operation),
    summary: `Registered ${operation.method.toUpperCase()} ${operation.path}`,
    description:
      'This registered route is included for API surface coverage. Its legacy request and response schemas have not yet been fully characterized.',
    tags: [tagForPath(operation.path)],
    ...(parameters.length > 0 ? { parameters } : {}),
    responses: {
      default: {
        description:
          'Response follows the current implementation; schema characterization is pending.',
      },
    },
    'x-serviceflow-contract-status': 'route-only',
  };
};

export const synchronizeOpenApiRoutes = (specification, registeredOperations) => {
  const synchronized = structuredClone(specification);
  const registeredByKey = new Map(
    registeredOperations.map((operation) => [operationKey(operation), operation])
  );
  const documentedKeys = new Set();
  const operationIds = new Set();

  for (const [path, pathItem] of Object.entries(synchronized.paths || {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;
      const key = operationKey({ method, path });
      if (!registeredByKey.has(key)) {
        throw new Error(`OpenAPI operation is not registered by the backend: ${key}`);
      }
      documentedKeys.add(key);
      operation['x-serviceflow-contract-status'] ||= 'characterized';
      if (operationIds.has(operation.operationId)) {
        throw new Error(`Duplicate OpenAPI operationId: ${operation.operationId}`);
      }
      operationIds.add(operation.operationId);
    }
  }

  let added = 0;
  for (const operation of registeredOperations) {
    const key = operationKey(operation);
    if (documentedKeys.has(key)) continue;
    synchronized.paths[operation.path] ||= {};
    const routeOnlyOperation = createRouteOnlyOperation(operation);
    if (operationIds.has(routeOnlyOperation.operationId)) {
      throw new Error(`Generated duplicate operationId: ${routeOnlyOperation.operationId}`);
    }
    operationIds.add(routeOnlyOperation.operationId);
    synchronized.paths[operation.path][operation.method] = routeOnlyOperation;
    added += 1;
  }

  synchronized.paths = Object.fromEntries(
    Object.entries(synchronized.paths).sort(([left], [right]) => left.localeCompare(right))
  );

  const usedTags = new Set();
  for (const pathItem of Object.values(synchronized.paths)) {
    for (const method of HTTP_METHODS) {
      for (const tag of pathItem[method]?.tags || []) usedTags.add(tag);
    }
  }
  const tagDescriptions = new Map(
    (synchronized.tags || []).map((tag) => [tag.name, tag.description])
  );
  synchronized.tags = [...usedTags].sort().map((name) => ({
    name,
    ...(tagDescriptions.get(name) ? { description: tagDescriptions.get(name) } : {}),
  }));

  return { specification: synchronized, added };
};

const isMainModule = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  try {
    const specification = JSON.parse(readFileSync(specificationPath, 'utf8'));
    const registeredOperations = collectRegisteredOperations(repositoryRoot);
    const synchronized = synchronizeOpenApiRoutes(specification, registeredOperations);
    const prettierConfig = (await resolveConfig(specificationPath)) || {};
    const formattedSpecification = await format(JSON.stringify(synchronized.specification), {
      ...prettierConfig,
      parser: 'json',
    });
    writeFileSync(specificationPath, formattedSpecification);
    console.log(
      `OpenAPI route catalog synchronized (${registeredOperations.length} registered operations, ${synchronized.added} added).`
    );
  } catch (error) {
    console.error(`OpenAPI synchronization failed: ${error.message}`);
    process.exitCode = 1;
  }
}
