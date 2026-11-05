import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptanceImages, composeArguments, runStackAcceptance } from '../run-stack-e2e.mjs';

/**
 * Function acceptanceFixture
 *
 * @description
 * Simulates project-local Docker state across build, bootstrap, browser execution and cleanup.
 *
 * @param {{ failAt?: string, failCleanup?: boolean, partialBuild?: boolean }} settings - Optional failing lifecycle boundary.
 * @returns {{ commands: Array<{ command: string, args: string[] }>, images: Set<string>, execute: Function }} Observable process boundary and its remaining owned tags.
 */
function acceptanceFixture({ failAt, failCleanup = false, partialBuild = false } = {}) {
  const commands = [];
  const images = new Set();
  const execute = (command, args) => {
    commands.push({ command, args });
    if (command === 'docker' && args[0] === 'image') {
      if (args[1] === 'ls') {
        const reference = args
          .find((arg) => arg.startsWith('reference='))
          .slice('reference='.length);
        return { status: 0, stdout: images.has(reference) ? 'owned-image-id' : '' };
      }
      if (args[1] === 'rm') {
        if (failCleanup) return { status: 1 };
        images.delete(args[2]);
      }
    }
    if (args[0] === 'compose' && args.includes('up')) {
      const built = acceptanceImages(args[2]);
      for (const image of partialBuild ? built.slice(0, 1) : built) images.add(image);
      if (failAt === 'up') return { status: 1 };
    }
    if (args.includes('identity-bootstrap')) {
      return {
        status: failAt === 'bootstrap' ? 1 : 0,
        stdout: 'Account created for acceptance@localhost.test (password only).',
      };
    }
    if (args.includes('e2e') && failAt === 'browser') return { status: 1 };
    return { status: 0, stdout: '' };
  };
  return { commands, images, execute };
}

test('Compose lifecycle refuses shared or malformed project names', () => {
  for (const name of ['portfolio-dev', 'portfolio', '', 'portfolio-e2e-../../portfolio-dev']) {
    assert.throws(() => composeArguments(name, ['down', '--volumes']), /non-disposable/);
    assert.throws(() => acceptanceImages(name), /non-disposable/);
  }
  assert.deepEqual(
    composeArguments('portfolio-e2e-0123456789abcdef', ['down', '--volumes']).slice(-2),
    ['down', '--volumes'],
  );
});

test('image references stay within the exact validated project namespace', () => {
  assert.deepEqual(acceptanceImages('portfolio-e2e-0123456789abcdef'), [
    'portfolio-e2e-0123456789abcdef-identity-service:latest',
    'portfolio-e2e-0123456789abcdef-content-service:latest',
    'portfolio-e2e-0123456789abcdef-contact-service:latest',
  ]);
});

test('bootstrap failure tears down only the generated project and does not print credentials', () => {
  const commands = [];
  assert.throws(
    () =>
      runStackAcceptance((command, args) => {
        commands.push({ command, args });
        return { status: args.includes('identity-bootstrap') ? 1 : 0, stdout: '' };
      }),
    /Acceptance command failed/,
  );
  const docker = commands.filter(
    (command) => command.command === 'docker' && command.args[0] === 'compose',
  );
  const projects = new Set(docker.map(({ args }) => args[2]));
  assert.equal(projects.size, 1);
  assert.match([...projects][0], /^portfolio-e2e-[a-f0-9]{16}$/);
  assert.ok(docker.at(-1).args.includes('down'));
  assert.ok(docker.at(-1).args.includes('--volumes'));
  assert.ok(commands.every(({ args }) => !args.some((arg) => arg.includes('secrets/'))));
});

test('existing labelled resources are never started or removed', () => {
  const commands = [];
  assert.throws(
    () =>
      runStackAcceptance((command, args) => {
        commands.push({ command, args });
        return { status: 0, stdout: args[0] === 'ps' ? 'existing-container' : '' };
      }),
    /existing acceptance project/,
  );
  assert.ok(commands.every(({ args }) => !args.includes('up') && !args.includes('down')));
});

test('existing image tags are refused before any artifact build or resource cleanup', () => {
  const commands = [];
  assert.throws(
    () =>
      runStackAcceptance((command, args) => {
        commands.push({ command, args });
        return { status: 0, stdout: args[0] === 'image' ? 'existing-image' : '' };
      }),
    /existing acceptance image/,
  );
  assert.ok(commands.every(({ command }) => command === 'docker'));
  assert.ok(
    commands.every(
      ({ args }) => !args.includes('up') && !args.includes('down') && !args.includes('rm'),
    ),
  );
});

test('ambient Compose project and environment files cannot redirect owned image names', () => {
  const fixture = acceptanceFixture();
  const composeEnvironments = [];
  runStackAcceptance((command, args, options) => {
    if (command === 'docker' && args[0] === 'compose') {
      composeEnvironments.push({ project: args[2], env: { ...options.env } });
    }
    return fixture.execute(command, args);
  });
  assert.ok(composeEnvironments.length > 0);
  for (const { project, env } of composeEnvironments) {
    assert.equal(env.COMPOSE_PROJECT_NAME, project);
    assert.equal(env.COMPOSE_DISABLE_ENV_FILE, '1');
    assert.equal(env.COMPOSE_ENV_FILES, '');
    assert.equal(env.COMPOSE_PROFILES, '');
  }
});

test('services build once and jobs reuse their images before exact project cleanup', () => {
  const fixture = acceptanceFixture();
  runStackAcceptance(fixture.execute);
  const compose = fixture.commands.filter(({ args }) => args[0] === 'compose');
  const start = compose.find(({ args }) => args.includes('up'));
  assert.equal(compose.filter(({ args }) => args.includes('--build')).length, 1);
  assert.ok(start.args.includes('--wait'));
  assert.ok(compose.find(({ args }) => args.includes('content-seed')));
  assert.ok(compose.find(({ args }) => args.includes('identity-bootstrap')));
  const teardown = fixture.commands.findIndex(({ args }) => args.includes('down'));
  const removed = fixture.commands.filter(({ args }) => args[0] === 'image' && args[1] === 'rm');
  assert.deepEqual(
    removed.map(({ args }) => args[2]),
    acceptanceImages(start.args[2]),
  );
  assert.ok(removed.every((command) => fixture.commands.indexOf(command) > teardown));
  assert.ok(removed.every(({ args }) => args.length === 3 && !args.includes('--force')));
  assert.equal(fixture.images.size, 0);
  assert.ok(
    fixture.commands.every(({ args }) => !args.includes('prune') || args.includes('run-many')),
  );
});

for (const failAt of ['up', 'bootstrap', 'browser']) {
  test(`${failAt} failure still removes its containers, volumes and completed image tags`, () => {
    const fixture = acceptanceFixture({ failAt, partialBuild: failAt === 'up' });
    assert.throws(() => runStackAcceptance(fixture.execute), /Acceptance command failed/);
    assert.equal(fixture.images.size, 0);
    const teardown = fixture.commands.find(({ args }) => args.includes('down'));
    assert.ok(teardown.args.includes('--volumes'));
    assert.ok(teardown.args.includes('--remove-orphans'));
    const removed = fixture.commands.filter(({ args }) => args[0] === 'image' && args[1] === 'rm');
    assert.equal(removed.length, failAt === 'up' ? 1 : 3);
    assert.ok(removed.every(({ args }) => acceptanceImages(teardown.args[2]).includes(args[2])));
  });
}

test('image cleanup failure preserves the original browser failure and attempts all owned tags', () => {
  const fixture = acceptanceFixture({ failAt: 'browser', failCleanup: true });
  assert.throws(
    () => runStackAcceptance(fixture.execute),
    (error) => {
      assert.ok(error instanceof AggregateError);
      assert.match(error.message, /Acceptance command failed.*cleanup also failed/);
      assert.equal(error.errors.length, 4);
      assert.match(error.errors[0].message, /Acceptance command failed/);
      return true;
    },
  );
  assert.equal(
    fixture.commands.filter(({ args }) => args[0] === 'image' && args[1] === 'rm').length,
    3,
  );
});

test('cleanup failure after a successful journey remains a failed acceptance run', () => {
  const fixture = acceptanceFixture({ failCleanup: true });
  assert.throws(() => runStackAcceptance(fixture.execute), /Acceptance cleanup failed/);
});

for (const diagnosticFailure of [false, true]) {
  test(`startup failure logs only migration jobs before cleanup (diagnostic failure: ${diagnosticFailure})`, () => {
    const fixture = acceptanceFixture({ failAt: 'up' });
    assert.throws(
      () =>
        runStackAcceptance((command, args) => {
          const result = fixture.execute(command, args);
          if (args.includes('logs') && diagnosticFailure)
            throw new Error('Diagnostic unavailable.');
          return result;
        }),
      (error) => {
        assert.equal(error.message, 'Acceptance command failed: docker (exit 1)');
        assert.ok(!(error instanceof AggregateError));
        return true;
      },
    );
    const diagnostic = fixture.commands.findIndex(({ args }) => args.includes('logs'));
    const teardown = fixture.commands.findIndex(({ args }) => args.includes('down'));
    assert.ok(diagnostic >= 0 && teardown > diagnostic);
    assert.deepEqual(fixture.commands[diagnostic].args.slice(7), [
      'logs',
      '--no-color',
      '--tail=80',
      'content-migrate',
      'contact-migrate',
      'identity-migrate',
    ]);
    assert.equal(fixture.images.size, 0);
  });
}
