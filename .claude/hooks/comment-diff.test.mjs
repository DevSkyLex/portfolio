import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const script = path.resolve('.agents/scripts/comment-diff.mjs');
test('compares syntax and directives without relying on git', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'comment-diff-'));
  try {
    const before = path.join(dir, 'before.ts');
    const after = path.join(dir, 'untracked.ts');
    const run = (oldText, newText) => {
      fs.writeFileSync(before, oldText);
      fs.writeFileSync(after, newText);
      return spawnSync(process.execPath, [script, before, after], { encoding: 'utf8' }).status;
    };
    assert.equal(run('const x = "a b"; // old\n', 'const x="a b"; // new\n'), 0);
    assert.equal(
      run(
        '/** Angular view. */\nexport class X {}',
        '/** Angular component. */\nexport class X {}',
      ),
      0,
    );
    assert.equal(
      run('/** old */\nexport function f() {}', '/** new */\nexport function f() {}'),
      0,
    );
    assert.equal(run('const x = "a b";', 'const x = "ab";'), 1);
    assert.equal(run('const x = `hello ${1} world`;', 'const x = `hello ${1}world`;'), 1);
    assert.equal(run('// eslint-disable-next-line\nconst x = 1;', '// removed\nconst x = 1;'), 1);
    assert.equal(run('// prettier-ignore\nconst x = 1;', '// removed\nconst x = 1;'), 1);
    assert.equal(run('// c8 ignore next\nconst x = 1;', '// removed\nconst x = 1;'), 1);
    assert.equal(
      run(
        'const x = `hello ${1} world`;\n// eslint-disable-next-line\nconst y = 2;',
        'const x = `hello ${1} world`;\n// removed\nconst y = 2;',
      ),
      1,
    );
    assert.equal(
      run('function f() { /* prettier-ignore */ }', 'function f() { /* ordinary comment */ }'),
      1,
    );
    assert.equal(
      run('/** @deprecated Use y. */\nconst x = 1;', '/** Removed. */\nconst x = 1;'),
      1,
    );
    assert.equal(run('/** @author Ada */\nconst x = 1;', '/** @author Grace */\nconst x = 1;'), 1);
    assert.equal(run('const x = 1;', 'const x = ;'), 2);
    assert.throws(() =>
      execFileSync(process.execPath, [script, before, path.join(dir, 'x.html')], { stdio: 'pipe' }),
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
