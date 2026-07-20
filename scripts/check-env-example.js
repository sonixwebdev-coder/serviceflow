import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, extname, relative, resolve } from 'node:path';

const ignoredDirectories = new Set([
  '.git',
  '.idea',
  'coverage',
  'dist',
  'logs',
  'node_modules',
  'storage',
  'uploads',
]);
const javaScriptExtensions = new Set(['.cjs', '.js', '.jsx', '.mjs', '.ts', '.tsx']);
const viteBuiltIns = new Set(['BASE_URL', 'DEV', 'MODE', 'PROD', 'SSR']);
const shellBuiltIns = new Set([
  'CI',
  'HOME',
  'HOSTNAME',
  'OLDPWD',
  'PATH',
  'PWD',
  'SHELL',
  'SHLVL',
  'TERM',
  'TMPDIR',
  'USER',
]);

const walk = (directory, files = []) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;

    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) walk(absolutePath, files);
    else if (entry.isFile()) files.push(absolutePath);
  }

  return files;
};

const addMatches = (references, source, pattern) => {
  for (const match of source.matchAll(pattern)) references.add(match[1]);
};

export const extractJavaScriptReferences = (source) => {
  const references = new Set();
  addMatches(references, source, /(?:process|import\.meta)\.env\.([A-Z][A-Z0-9_]*)/g);
  addMatches(
    references,
    source,
    /(?:process|import\.meta)\.env\[\s*['"]([A-Z][A-Z0-9_]*)['"]\s*\]/g
  );
  for (const variable of viteBuiltIns) references.delete(variable);
  return references;
};

const extractBracedShellReferences = (source) => {
  const references = new Set();
  addMatches(references, source, /(?<!\$)\$\{([A-Z][A-Z0-9_]*)(?=[-:}?+]|\})[^}]*\}/g);
  return references;
};

export const extractShellReferences = (source) => {
  const references = extractBracedShellReferences(source);
  addMatches(references, source, /(?<![$\\])\$([A-Z][A-Z0-9_]*)\b/g);

  const assignedVariables = new Set();
  addMatches(
    assignedVariables,
    source,
    /^\s*(?:(?:export|local|readonly)\s+)?([A-Z][A-Z0-9_]*)\s*=/gm
  );

  for (const variable of [...assignedVariables, ...shellBuiltIns]) references.delete(variable);
  return references;
};

export const extractComposeReferences = (source) => extractBracedShellReferences(source);

export const extractDockerfileReferences = (source) => {
  const references = extractShellReferences(source);
  addMatches(references, source, /^\s*ARG\s+([A-Z][A-Z0-9_]*)(?:\s|=|$)/gm);
  addMatches(references, source, /^\s*ENV\s+([A-Z][A-Z0-9_]*)(?:\s|=|$)/gm);
  return references;
};

const isJavaScriptTest = (filePath) =>
  filePath.split(/[\\/]/).includes('__tests__') || /\.(?:spec|test)\.[cm]?[jt]sx?$/.test(filePath);

const isComposeFile = (filePath) => /^docker-compose(?:\.[^.]+)?\.ya?ml$/.test(basename(filePath));
const isDockerfile = (filePath) => /^Dockerfile(?:\..+)?$/.test(basename(filePath));

export const discoverSourceFiles = (repositoryRoot) =>
  walk(repositoryRoot)
    .filter((filePath) => {
      const extension = extname(filePath);
      if (javaScriptExtensions.has(extension)) return !isJavaScriptTest(filePath);
      return extension === '.sh' || isComposeFile(filePath) || isDockerfile(filePath);
    })
    .sort();

const referencesForFile = (filePath, source) => {
  if (javaScriptExtensions.has(extname(filePath))) return extractJavaScriptReferences(source);
  if (extname(filePath) === '.sh') return extractShellReferences(source);
  if (isComposeFile(filePath)) return extractComposeReferences(source);
  if (isDockerfile(filePath)) return extractDockerfileReferences(source);
  return new Set();
};

export const referencedVariables = (repositoryRoot) => {
  const references = new Set();

  for (const filePath of discoverSourceFiles(repositoryRoot)) {
    const source = readFileSync(filePath, 'utf8');
    for (const variable of referencesForFile(filePath, source)) references.add(variable);
  }

  return [...references].sort();
};

export const documentedVariables = (contents) => {
  const values = new Map();
  const duplicates = new Set();
  const malformedLines = [];

  for (const [index, line] of contents.split(/\r?\n/).entries()) {
    if (!line.trim() || /^\s*#/.test(line)) continue;

    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=(.*)$/);
    if (!match) {
      malformedLines.push(index + 1);
      continue;
    }
    if (values.has(match[1])) duplicates.add(match[1]);
    values.set(match[1], match[2].trim());
  }

  return {
    values,
    duplicates: [...duplicates].sort(),
    malformedLines,
  };
};

export const credentialLikeValues = (values) => {
  const findings = [];
  const secretName =
    /(API_KEY|CLIENT_SECRET|ENCRYPTION_KEY|JWT_.*SECRET|PASSWORD|PRIVATE_KEY|SECRET_KEY|WEBHOOK_SECRET)$/;
  const knownCredentialShape = /(?:^|[^a-z])(sk_live_|pk_live_|whsec_|AIza[0-9A-Za-z_-]{20,})/i;

  for (const [name, value] of values) {
    if (!value) continue;
    if (secretName.test(name)) findings.push(name);
    else if (knownCredentialShape.test(value)) findings.push(name);
  }

  return findings.sort();
};

export const discoverEnvironmentExamples = (repositoryRoot) =>
  walk(repositoryRoot)
    .filter((filePath) => basename(filePath) === '.env.example')
    .sort();

export const validateRepositoryEnvironment = (repositoryRoot) => {
  const canonicalPath = resolve(repositoryRoot, '.env.example');
  if (!existsSync(canonicalPath)) return { errors: ['.env.example is missing'] };

  const references = referencedVariables(repositoryRoot);
  const examplePaths = discoverEnvironmentExamples(repositoryRoot);
  const parsedExamples = examplePaths.map((filePath) => ({
    filePath,
    ...documentedVariables(readFileSync(filePath, 'utf8')),
  }));
  const canonical = parsedExamples.find(({ filePath }) => filePath === canonicalPath);
  const errors = [];

  for (const example of parsedExamples) {
    const label = relative(repositoryRoot, example.filePath) || '.env.example';
    if (example.duplicates.length) {
      errors.push(`${label}: duplicate variables: ${example.duplicates.join(', ')}`);
    }
    if (example.malformedLines.length) {
      errors.push(`${label}: malformed assignments on lines ${example.malformedLines.join(', ')}`);
    }

    const credentialLike = credentialLikeValues(example.values);
    if (credentialLike.length) {
      errors.push(
        `${label}: credential-shaped example values must be blank: ${credentialLike.join(', ')}`
      );
    }

    if (example.filePath !== canonicalPath) {
      const unknown = [...example.values.keys()]
        .filter((name) => !canonical.values.has(name))
        .sort();
      if (unknown.length) {
        errors.push(`${label}: variables missing from root .env.example: ${unknown.join(', ')}`);
      }
    }
  }

  const missing = references.filter((name) => !canonical.values.has(name));
  if (missing.length) errors.push(`Undocumented variables: ${missing.join(', ')}`);

  return {
    errors,
    exampleCount: examplePaths.length,
    documentedCount: canonical.values.size,
    referencedCount: references.length,
  };
};

export const main = (repositoryRoot = process.cwd()) => {
  const result = validateRepositoryEnvironment(repositoryRoot);
  if (result.errors.length) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
    return;
  }

  console.log(
    `Environment examples validated (${result.exampleCount} files, ${result.documentedCount} root variables, ${result.referencedCount} referenced).`
  );
};

const invokedPath = process.argv[1] && resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) main();
