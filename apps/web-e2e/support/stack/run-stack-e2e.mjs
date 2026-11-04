import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

/**
 * Function assertDisposableProject
 *
 * @description
 * Restricts all derived Compose and image names to the runner's randomly generated namespace.
 *
 * @param {string} project - Candidate acceptance project name.
 * @returns {void}
 */
function assertDisposableProject(project) {
  if (!/^portfolio-e2e-[a-f0-9]{16}$/.test(project)) {
    throw new Error('Refusing a non-disposable Compose project.');
  }
}

/**
 * Function acceptanceImages
 *
 * @description
 * Names the three project-owned image tags reused by services and their migration/bootstrap jobs.
 *
 * @param {string} project - Validated disposable acceptance project.
 * @returns {string[]} Exact local image references; no shared image or wildcard is included.
 */
export function acceptanceImages(project) {
  assertDisposableProject(project);
  return ['identity-service', 'content-service', 'contact-service'].map(
    (service) => `${project}-${service}:latest`,
  );
}

/**
 * Function composeArguments
 *
 * @description
 * Constrains every lifecycle command, especially volume deletion, to this runner's disposable project.
 *
 * @param {string} project - Unique disposable project name.
 * @param {string[]} args - Compose operation and arguments.
 * @returns {string[]} Arguments for the local Docker CLI.
 */
export function composeArguments(project, args) {
  assertDisposableProject(project);
  return [
    'compose',
    '-p',
    project,
    '-f',
    'docker/compose.dev.yml',
    '-f',
    'docker/compose.e2e.yml',
    ...args,
  ];
}

/**
 * Function runStackAcceptance
 *
 * @description
 * Builds isolated acceptance artifacts, creates a fresh database and administrator, and runs Chromium
 * journeys. The generated password remains in process memory; the administrator starts without a second
 * factor and the journeys enroll one through the admin API (D17). The finally block
 * removes only the randomly named test project and its image tags, including on bootstrap or browser
 * failure. Existing resources and tags are refused before any build starts.
 *
 * @param {(command: string, args: string[], options: object) => { status: number | null, stdout?: string, error?: Error }} execute - Process boundary, injectable for lifecycle tests.
 * @returns {void}
 */
export function runStackAcceptance(execute = spawnSync) {
  const project = `portfolio-e2e-${randomBytes(8).toString('hex')}`;
  const root = fileURLToPath(new URL('../../../../', import.meta.url));
  const nx = resolve(root, 'node_modules/nx/dist/bin/nx.js');
  const env = {
    ...process.env,
    NX_DAEMON: 'false',
    NX_ISOLATE_PLUGINS: 'false',
    COMPOSE_PROJECT_NAME: project,
    COMPOSE_DISABLE_ENV_FILE: '1',
    COMPOSE_ENV_FILES: '',
    COMPOSE_PROFILES: '',
  };
  const images = acceptanceImages(project);
  const run = (command, args, extra = {}) => {
    const result = execute(command, args, {
      cwd: root,
      env,
      encoding: 'utf8',
      windowsHide: true,
      stdio: 'inherit',
      ...extra,
    });
    if (result.error || result.status !== 0)
      throw new Error(`Acceptance command failed: ${command} (exit ${result.status})`);
    return result.stdout ?? '';
  };
  const docker = (args, options) => run('docker', composeArguments(project, args), options);
  const imageExists = (image) =>
    run('docker', ['image', 'ls', '--quiet', '--filter', `reference=${image}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim() !== '';
  for (const args of [
    ['ps', '--all', '--filter', `label=com.docker.compose.project=${project}`, '--quiet'],
    ['volume', 'ls', '--filter', `label=com.docker.compose.project=${project}`, '--quiet'],
  ]) {
    if (run('docker', args, { stdio: ['ignore', 'pipe', 'pipe'] }).trim()) {
      throw new Error('Refusing to reuse an existing acceptance project.');
    }
  }
  if (images.some(imageExists)) {
    throw new Error('Refusing to overwrite an existing acceptance image.');
  }
  run(process.execPath, [
    nx,
    'run-many',
    '-t',
    'prune',
    '-p',
    'identity-service',
    'content-service',
    'contact-service',
    '--parallel=2',
  ]);
  run(process.execPath, [nx, 'build', 'web']);
  let started = false;
  let primaryError;

  /** @type {unknown[]} Cleanup failures retained until both lifecycle phases have completed. */
  const cleanupErrors = [];
  try {
    started = true;
    docker(['up', '--build', '--detach', '--wait']);
    docker(['--profile', 'seed', 'run', '--rm', 'content-seed']);
    env.IDENTITY_BOOTSTRAP_PASSWORD = randomBytes(24).toString('base64url');
    const output = docker(
      [
        '--profile',
        'ops',
        'run',
        '--rm',
        '-e',
        'IDENTITY_BOOTSTRAP_PASSWORD',
        'identity-bootstrap',
        'acceptance@localhost.test',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    if (!output.includes('acceptance@localhost.test')) {
      throw new Error('Bootstrap did not create the acceptance administrator.');
    }
    const testEnv = {
      ...env,
      BASE_URL: 'http://localhost:18080',
      MAILPIT_URL: 'http://localhost:18025',
      STACK_EMAIL: 'acceptance@localhost.test',
      STACK_PASSWORD: env.IDENTITY_BOOTSTRAP_PASSWORD,
    };
    run(
      process.execPath,
      [nx, 'e2e', 'web-e2e', '--', '--project=chromium', '--grep=@stack', '--workers=1'],
      { env: testEnv },
    );
  } catch (error) {
    primaryError = error;
  } finally {
    delete env.IDENTITY_BOOTSTRAP_PASSWORD;
    if (started) {
      try {
        docker(['down', '--volumes', '--remove-orphans']);
      } catch (error) {
        cleanupErrors.push(error);
      }
      // Remove exact owned tags only after teardown; shared layers and BuildKit caches remain reusable.
      for (const image of images) {
        try {
          if (imageExists(image)) run('docker', ['image', 'rm', image]);
        } catch (error) {
          cleanupErrors.push(error);
        }
      }
    }
  }
  if (cleanupErrors.length) {
    throw new AggregateError(
      primaryError ? [primaryError, ...cleanupErrors] : cleanupErrors,
      primaryError
        ? `${primaryError.message} Acceptance cleanup also failed.`
        : 'Acceptance cleanup failed.',
    );
  }
  if (primaryError) throw primaryError;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    runStackAcceptance();
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Stack acceptance failed.');
    process.exitCode = 1;
  }
}
