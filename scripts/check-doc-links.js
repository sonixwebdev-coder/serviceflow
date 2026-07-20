import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';

const root = process.cwd();
const rootDocuments = [
  'README.md',
  'ATTRIBUTION.md',
  'CHANGELOG.md',
  'CODE_OF_CONDUCT.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'SUPPORT.md',
  'apps/backend/README.md',
];

const collectMarkdown = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) return collectMarkdown(path);
    return extname(entry.name) === '.md' ? [path] : [];
  });

const documents = [
  ...rootDocuments.map((path) => resolve(root, path)).filter(existsSync),
  ...collectMarkdown(resolve(root, 'docs')),
];
const linkPattern = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const errors = [];

for (const document of documents) {
  const content = readFileSync(document, 'utf8');
  for (const match of content.matchAll(linkPattern)) {
    const target = match[1];
    if (/^(?:https?:|mailto:|#)/i.test(target)) continue;

    const decodedPath = decodeURIComponent(target.split('#', 1)[0]);
    if (!decodedPath) continue;
    const resolvedTarget = resolve(dirname(document), decodedPath);
    if (!existsSync(resolvedTarget)) {
      errors.push(`${document.slice(root.length + 1)}: missing ${target}`);
      continue;
    }
    if (!statSync(resolvedTarget).isFile()) {
      errors.push(`${document.slice(root.length + 1)}: ${target} is not a file`);
    }
  }
}

if (errors.length > 0) {
  console.error(`Documentation link validation failed:\n${errors.join('\n')}`);
  process.exit(1);
}

console.log(`Documentation links validated (${documents.length} Markdown files).`);
