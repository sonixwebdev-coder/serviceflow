import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const composeFile = resolve(repositoryRoot, 'docker-compose.test.yml');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

export const parsePublishedPort = (value) => {
  const match = value.trim().match(/:(\d+)$/);
  if (!match) throw new Error(`Could not parse a published port from: ${value.trim()}`);
  return Number(match[1]);
};

export const createIntegrationEnvironment = (baseEnvironment, postgresPort, redisPort) => ({
  ...baseEnvironment,
  DATABASE_URL:
    `postgresql://serviceflow:integration-only@127.0.0.1:${postgresPort}` +
    '/serviceflow_test?schema=public',
  REDIS_URL: `redis://127.0.0.1:${redisPort}`,
  NODE_ENV: 'test',
});

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    env: options.env || process.env,
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    encoding: options.capture ? 'utf8' : undefined,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const details = options.capture ? `\n${result.stderr || result.stdout}` : '';
    throw new Error(`${command} ${args.join(' ')} failed with status ${result.status}${details}`);
  }

  return options.capture ? result.stdout.trim() : '';
};

export const main = () => {
  const projectName = `serviceflow-integration-${process.pid}`;
  const composeArgs = ['compose', '--project-name', projectName, '--file', composeFile];
  let started = false;
  let cleaningUp = false;

  const cleanup = () => {
    if (!started || cleaningUp) return;
    cleaningUp = true;
    run('docker', [...composeArgs, 'down', '--volumes', '--remove-orphans']);
    started = false;
  };

  const stopForSignal = (exitCode) => {
    try {
      cleanup();
    } finally {
      process.exit(exitCode);
    }
  };

  process.once('SIGINT', () => stopForSignal(130));
  process.once('SIGTERM', () => stopForSignal(143));

  try {
    run('docker', ['compose', 'version']);
    started = true;
    run('docker', [...composeArgs, 'up', '--detach', '--wait']);

    const postgresPort = parsePublishedPort(
      run('docker', [...composeArgs, 'port', 'postgres', '5432'], { capture: true })
    );
    const redisPort = parsePublishedPort(
      run('docker', [...composeArgs, 'port', 'redis', '6379'], { capture: true })
    );
    const integrationEnvironment = createIntegrationEnvironment(
      process.env,
      postgresPort,
      redisPort
    );

    run(
      npmCommand,
      ['exec', '--', 'prisma', 'migrate', 'deploy', '--schema', 'prisma/schema.prisma'],
      { env: integrationEnvironment }
    );
    run(npmCommand, ['run', 'test:integration', '--workspace', 'apps/backend'], {
      env: integrationEnvironment,
    });
  } finally {
    cleanup();
  }
};

const invokedPath = process.argv[1] && resolve(process.argv[1]);
if (invokedPath === fileURLToPath(import.meta.url)) main();
