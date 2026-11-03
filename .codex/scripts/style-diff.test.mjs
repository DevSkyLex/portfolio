// Tests of the pure part of style-diff.mjs: `node --test .codex/scripts/style-diff.test.mjs`.
// No browser is launched; compare() is exercised by the design-fidelity procedure itself.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_PROPERTIES,
  diffStyles,
  normalizeValue,
  parseSpec,
  valuesMatch,
} from './style-diff.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const spec = {
  site: 'http://localhost:4300/',
  mockup: 'http://127.0.0.1:8791/Main.dc.html',
  pairs: [{ site: 'h1', mockup: 'h1' }],
};

void test('completes a minimal spec with defaults', () => {
  const parsed = parseSpec(spec);
  assert.deepEqual(parsed.viewports, [{ width: 1440, height: 900 }]);
  assert.equal(parsed.properties, DEFAULT_PROPERTIES);
  assert.equal(parsed.tolerancePx, 1);
  assert.equal(parsed.pairs[0].name, 'pair 1');
});

void test('rejects malformed specs', () => {
  assert.throws(() => parseSpec({ ...spec, site: 'file:///x' }), /site/);
  assert.throws(() => parseSpec({ ...spec, pairs: [] }), /pairs/);
  assert.throws(() => parseSpec({ ...spec, pairs: [{ site: 'h1' }] }), /selector/);
  assert.throws(() => parseSpec({ ...spec, viewports: [{ width: 1440 }] }), /viewport/);
});

void test('normalizes whitespace, quotes and long decimals', () => {
  assert.equal(
    normalizeValue('  "Unbounded Variable",   sans-serif '),
    "'Unbounded Variable', sans-serif",
  );
  assert.equal(normalizeValue('12.345678px'), '12.345px');
});

void test('matches px values within the tolerance and nothing else', () => {
  assert.equal(valuesMatch('64px', '64.6px', 1), true);
  assert.equal(valuesMatch('64px', '66px', 1), false);
  assert.equal(valuesMatch(420, 420.8, 1), true);
  assert.equal(valuesMatch('rgb(244, 243, 255)', 'rgb(244, 243, 254)', 1), false);
  assert.equal(valuesMatch('600', '700', 1), false);
  assert.equal(valuesMatch('normal', '0px', 1), false);
});

void test('lists only the differing properties', () => {
  const site = { 'font-size': '64px', color: 'rgb(244, 243, 255)', 'box.width': 640 };
  const mockup = { 'font-size': '72px', color: 'rgb(244, 243, 255)', 'box.width': 640.4 };
  assert.deepEqual(diffStyles(site, mockup, ['font-size', 'color', 'box.width']), [
    { property: 'font-size', site: '64px', mockup: '72px' },
  ]);
});

void test('the CLI fails with exit 2 on a missing or invalid spec', () => {
  const run = (args) =>
    spawnSync(process.execPath, [path.join(here, 'style-diff.mjs'), ...args], {
      encoding: 'utf8',
      windowsHide: true,
    });
  assert.equal(run([]).status, 2);
  assert.equal(run([path.join(here, 'missing-spec.json')]).status, 2);
});
