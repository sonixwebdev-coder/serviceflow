import { existsSync, readdirSync, statSync } from 'node:fs';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultApplications = ['apps/frontend', 'apps/client-portal', 'apps/admin', 'apps/website'];

const walkJavaScript = (directory, files = []) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const filePath = resolve(directory, entry.name);
    if (entry.isDirectory()) walkJavaScript(filePath, files);
    else if (entry.isFile() && extname(entry.name) === '.js') files.push(filePath);
  }
  return files;
};

export const inspectBundles = (
  repositoryRoot,
  { applications = defaultApplications, maximumBytes = 500_000 } = {}
) => {
  const missing = [];
  const chunks = [];

  for (const application of applications) {
    const distributionDirectory = resolve(repositoryRoot, application, 'dist');
    if (!existsSync(distributionDirectory)) {
      missing.push(`${application}/dist`);
      continue;
    }

    for (const filePath of walkJavaScript(distributionDirectory)) {
      chunks.push({
        path: relative(repositoryRoot, filePath).replaceAll('\\', '/'),
        bytes: statSync(filePath).size,
      });
    }
  }

  chunks.sort((left, right) => right.bytes - left.bytes || left.path.localeCompare(right.path));
  return {
    chunks,
    missing,
    oversized: chunks.filter(({ bytes }) => bytes > maximumBytes),
    maximumBytes,
  };
};

export const main = (repositoryRoot = process.cwd()) => {
  const result = inspectBundles(repositoryRoot);
  const errors = [];
  if (result.missing.length) {
    errors.push(`Missing production builds: ${result.missing.join(', ')}`);
  }
  if (result.chunks.length === 0 && result.missing.length === 0) {
    errors.push('Production builds contain no JavaScript chunks');
  }
  if (result.oversized.length) {
    errors.push(
      `JavaScript chunks exceed ${result.maximumBytes} bytes:\n${result.oversized
        .map(({ path, bytes }) => `- ${path}: ${bytes} bytes`)
        .join('\n')}`
    );
  }

  if (errors.length) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
    return;
  }

  const largest = result.chunks[0];
  console.log(
    `Bundle budget passed (${result.chunks.length} JavaScript chunks, largest ${largest.path}: ${largest.bytes} bytes).`
  );
};

const invokedPath = process.argv[1] && resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) main();
