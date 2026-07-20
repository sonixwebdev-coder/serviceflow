import { operationKey } from './openapi-route-inventory.js';

export const OPENAPI_METHODS = Object.freeze([
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
  'trace',
]);

const PATH_ITEM_FIELDS = new Set([
  '$ref',
  'summary',
  'description',
  'servers',
  'parameters',
  ...OPENAPI_METHODS,
]);
const CONTRACT_STATUSES = new Set(['characterized', 'route-only']);

export const collectDocumentedOperations = (specification) => {
  const operations = new Map();
  for (const [path, pathItem] of Object.entries(specification.paths || {})) {
    for (const method of OPENAPI_METHODS) {
      if (pathItem[method]) operations.set(operationKey({ method, path }), pathItem[method]);
    }
  }
  return operations;
};

export const validatePathItemShape = (path, pathItem) => {
  const errors = [];
  if (!path.startsWith('/')) errors.push(`OpenAPI path must start with /: ${path}`);
  if (path.includes(':')) errors.push(`OpenAPI path must use {parameter} syntax: ${path}`);
  if (/[?#]/.test(path))
    errors.push(`OpenAPI path must not contain query or fragment syntax: ${path}`);

  const parameterNames = [...path.matchAll(/\{([A-Za-z_][\w]*)\}/g)].map((match) => match[1]);
  const pathWithoutParameters = path.replaceAll(/\{[A-Za-z_][\w]*\}/g, '');
  if (/[{}]/.test(pathWithoutParameters)) {
    errors.push(`OpenAPI path contains malformed parameter syntax: ${path}`);
  }
  if (new Set(parameterNames).size !== parameterNames.length) {
    errors.push(`OpenAPI path repeats a parameter name: ${path}`);
  }

  for (const field of Object.keys(pathItem)) {
    if (!PATH_ITEM_FIELDS.has(field) && !field.startsWith('x-')) {
      errors.push(`${path} contains unsupported path-item field ${field}`);
    }
  }

  return { errors, parameterNames };
};

export const validateOperationContractStatus = (key, operation) => {
  const errors = [];
  const status = operation['x-serviceflow-contract-status'];

  if (!CONTRACT_STATUSES.has(status)) {
    errors.push(`${key} must declare x-serviceflow-contract-status`);
    return errors;
  }
  if (status === 'route-only') {
    if (!operation.description) errors.push(`${key} route-only entry is missing description`);
    if (!operation.responses?.default) {
      errors.push(`${key} route-only entry must use a non-assertive default response`);
    }
    return errors;
  }

  const responseKeys = Object.keys(operation.responses || {});
  if (!responseKeys.some((response) => /^[1-5]\d{2}$/.test(response))) {
    errors.push(`${key} characterized entry must declare at least one explicit response status`);
  }
  if (responseKeys.includes('default')) {
    errors.push(`${key} characterized entry must not retain a generic default response`);
  }
  return errors;
};

export const validateRouteCoverage = (documentedOperations, registeredOperations) => {
  const errors = [];
  const registeredKeys = new Set(registeredOperations.map(operationKey));

  for (const operation of registeredOperations) {
    const key = operationKey(operation);
    if (!documentedOperations.has(key)) {
      const location = operation.source ? ` at ${operation.source}:${operation.line}` : '';
      errors.push(`${key} is registered${location} but undocumented`);
    }
  }
  for (const key of documentedOperations.keys()) {
    if (!registeredKeys.has(key))
      errors.push(`${key} is documented but not registered by the backend`);
  }

  return errors;
};
