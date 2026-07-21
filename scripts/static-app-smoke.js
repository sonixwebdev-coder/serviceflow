#!/usr/bin/env node

const defaultRoutes = {
  frontend: ['/dashboard'],
  portal: ['/login'],
  admin: ['/login'],
  website: ['/pricing'],
};

const usage = `Usage: STATIC_APP_URLS="frontend=http://localhost:5173,portal=http://localhost:5174" npm run static:smoke`;

function parseTargets(value) {
  if (!value) {
    throw new Error(`STATIC_APP_URLS is required.\n${usage}`);
  }

  const targets = value.split(',').map((entry) => {
    const separator = entry.indexOf('=');
    if (separator < 1) {
      throw new Error(`Invalid static app target "${entry}". Use name=url.\n${usage}`);
    }

    const name = entry.slice(0, separator).trim();
    const rawUrl = entry.slice(separator + 1).trim();
    if (!defaultRoutes[name]) {
      throw new Error(
        `Unknown static app "${name}". Expected one of ${Object.keys(defaultRoutes).join(', ')}.`
      );
    }

    const url = new URL(rawUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error(`Static app URL must use http or https: ${rawUrl}`);
    }

    return { name, url };
  });

  if (new Set(targets.map(({ name }) => name)).size !== targets.length) {
    throw new Error(`Each static app may be listed only once.\n${usage}`);
  }

  return targets;
}

async function fetchText(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
  return { body, response };
}

function assertSecurityHeaders(response, url) {
  const requiredHeaders = ['x-content-type-options', 'x-frame-options', 'referrer-policy'];
  for (const header of requiredHeaders) {
    if (!response.headers.get(header)) {
      throw new Error(`${url} is missing the ${header} response header`);
    }
  }
}

async function smokeTarget({ name, url }) {
  const root = new URL('/', url);
  const { body, response } = await fetchText(root);
  assertSecurityHeaders(response, root);
  if (!body.includes('<html') || !body.includes('<script')) {
    throw new Error(`${root} did not return an HTML application shell`);
  }

  const configUrl = new URL('/serviceflow-config.js', url);
  const config = await fetchText(configUrl);
  if (!config.response.headers.get('x-content-type-options')) {
    throw new Error(`${configUrl} is missing the x-content-type-options response header`);
  }
  if (!config.body.includes('window.__SERVICEFLOW_CONFIG__')) {
    throw new Error(`${configUrl} did not return the runtime configuration contract`);
  }
  if (config.response.headers.get('cache-control')?.includes('no-store') !== true) {
    throw new Error(`${configUrl} must be served without caching`);
  }

  for (const route of defaultRoutes[name]) {
    const routeUrl = new URL(route, url);
    const routeResponse = await fetchText(routeUrl);
    assertSecurityHeaders(routeResponse.response, routeUrl);
    if (!routeResponse.body.includes('<html')) {
      throw new Error(`${routeUrl} did not fall back to the SPA shell`);
    }
  }

  console.log(`Static app smoke passed: ${name} (${url.origin})`);
}

try {
  const targets = parseTargets(process.env.STATIC_APP_URLS);
  await Promise.all(targets.map(smokeTarget));
} catch (error) {
  console.error(`Static app smoke failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
}
