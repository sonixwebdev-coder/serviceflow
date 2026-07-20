import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  collectDocumentedOperations,
  OPENAPI_METHODS,
  validateOperationContractStatus,
  validatePathItemShape,
  validateRouteCoverage,
} from './openapi-contract-validation.js';
import { collectRegisteredOperations, operationKey } from './openapi-route-inventory.js';

const repositoryRoot = process.cwd();
const specificationPath = resolve(repositoryRoot, 'docs/openapi.json');
const specification = JSON.parse(readFileSync(specificationPath, 'utf8'));
const errors = [];
const operationIds = new Set();
const documentedOperations = collectDocumentedOperations(specification);
const methods = new Set(OPENAPI_METHODS);

const decodePointerSegment = (segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~');
const resolveReference = (candidate) => {
  if (!candidate?.$ref?.startsWith('#/')) return candidate;
  return candidate.$ref
    .slice(2)
    .split('/')
    .map(decodePointerSegment)
    .reduce((value, segment) => value?.[segment], specification);
};

const validateReferences = (value, location = '#') => {
  if (!value || typeof value !== 'object') return;
  if (value.$ref) {
    if (!value.$ref.startsWith('#/')) {
      errors.push(`${location} uses unsupported external reference ${value.$ref}`);
    } else if (!resolveReference(value)) {
      errors.push(`${location} contains unresolved reference ${value.$ref}`);
    }
  }
  for (const [key, child] of Object.entries(value)) {
    validateReferences(child, `${location}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`);
  }
};

if (!/^3\.1\.\d+$/.test(specification.openapi || '')) {
  errors.push('openapi must declare a 3.1.x version');
}
if (!specification.info?.title || !specification.info?.version) {
  errors.push('info.title and info.version are required');
}
if (!specification.paths || Object.keys(specification.paths).length === 0) {
  errors.push('at least one API path is required');
}

const declaredTags = new Set((specification.tags || []).map((tag) => tag.name));
if (declaredTags.size !== (specification.tags || []).length) {
  errors.push('top-level tags must have unique names');
}

for (const [path, pathItem] of Object.entries(specification.paths || {})) {
  const pathShape = validatePathItemShape(path, pathItem);
  errors.push(...pathShape.errors);
  const { parameterNames } = pathShape;

  for (const [method, operation] of Object.entries(pathItem)) {
    if (!methods.has(method)) continue;
    const key = operationKey({ method, path });

    if (!operation.operationId || !/^[A-Za-z][A-Za-z0-9]*$/.test(operation.operationId)) {
      errors.push(`${key} is missing a valid operationId`);
    } else if (operationIds.has(operation.operationId)) {
      errors.push(`duplicate operationId: ${operation.operationId}`);
    } else {
      operationIds.add(operation.operationId);
    }
    if (!operation.summary) errors.push(`${key} is missing summary`);
    if (!operation.responses || Object.keys(operation.responses).length === 0) {
      errors.push(`${key} is missing responses`);
    }
    for (const responseCode of Object.keys(operation.responses || {})) {
      if (!/^(?:default|[1-5](?:\d{2}|XX))$/.test(responseCode)) {
        errors.push(`${key} has invalid response key ${responseCode}`);
      }
    }

    errors.push(...validateOperationContractStatus(key, operation));

    if (!Array.isArray(operation.tags) || operation.tags.length === 0) {
      errors.push(`${key} must declare at least one tag`);
    } else {
      for (const tag of operation.tags) {
        if (!declaredTags.has(tag)) errors.push(`${key} uses undeclared tag ${tag}`);
      }
    }

    const parameters = [...(pathItem.parameters || []), ...(operation.parameters || [])]
      .map(resolveReference)
      .filter(Boolean);
    for (const name of parameterNames) {
      const parameter = parameters.find(
        (candidate) => candidate.in === 'path' && candidate.name === name
      );
      if (!parameter?.required) {
        errors.push(`${key} must declare required path parameter ${name}`);
      }
    }
    for (const parameter of parameters.filter((candidate) => candidate.in === 'path')) {
      if (!parameterNames.includes(parameter.name)) {
        errors.push(
          `${key} declares path parameter ${parameter.name} that is absent from the path`
        );
      }
    }
  }
}

validateReferences(specification);

let registeredOperations = [];
try {
  registeredOperations = collectRegisteredOperations(repositoryRoot);
} catch (error) {
  errors.push(`backend route inventory failed: ${error.message}`);
}

errors.push(...validateRouteCoverage(documentedOperations, registeredOperations));

if (errors.length > 0) {
  console.error(`OpenAPI validation failed:\n${errors.join('\n')}`);
  process.exit(1);
}

const characterized = [...documentedOperations.values()].filter(
  (operation) => operation['x-serviceflow-contract-status'] === 'characterized'
).length;
const routeOnly = documentedOperations.size - characterized;

console.log(
  `OpenAPI document validated (${Object.keys(specification.paths).length} paths, ${documentedOperations.size}/${registeredOperations.length} registered operations, ${characterized} characterized, ${routeOnly} route-only).`
);
