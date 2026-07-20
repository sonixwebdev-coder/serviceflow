#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const environmentFile = path.join(repositoryRoot, '.env');
const children = [];

const applications = [
  ['Backend API', 'dev:backend', 5000],
  ['CRM', 'dev:frontend', 5173],
  ['Client portal', 'dev:portal', 5174],
  ['Website renderer', 'dev:website', 5175],
  ['Platform admin', 'dev:admin', 5176],
];

const run = (args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn('npm', args, {
      cwd: repositoryRoot,
      stdio: 'inherit',
      ...options,
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npm ${args.join(' ')} exited with code ${code}`));
    });
  });

const startApplication = ([label, script, port]) => {
  console.log(`Starting ${label} on port ${port}`);
  const child = spawn('npm', ['run', script], {
    cwd: repositoryRoot,
    stdio: 'inherit',
  });
  child.once('error', (error) => console.error(`${label} failed to start:`, error));
  children.push(child);
};

const shutdown = () => {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
};

const main = async () => {
  if (!fs.existsSync(environmentFile)) {
    console.error('Missing .env. Copy .env.example to .env and replace the example secrets.');
    process.exitCode = 1;
    return;
  }

  await run(['run', 'prisma:generate', '--workspace', 'apps/backend']);
  console.log(
    'Database migrations are not automatic. Run the backend prisma:migrate command when needed.'
  );

  for (const application of applications) startApplication(application);

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
};

main().catch((error) => {
  console.error(error.message);
  shutdown();
  process.exitCode = 1;
});
