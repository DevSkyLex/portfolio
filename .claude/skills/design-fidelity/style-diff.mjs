#!/usr/bin/env node
/**
 * Computed-style diff between the mockup and the site (portfolio design-fidelity review).
 *
 *   node .claude/skills/design-fidelity/style-diff.mjs <spec.json>
 *
 * Opens both pages in Playwright Chromium at every viewport of the spec, with reduced motion and
 * transitions/animations disabled (final values, not mid-transition ones), waits for the fonts, reads
 * `getComputedStyle` and the bounding box of each selector pair and prints a JSON report of the
 * properties that differ. Nothing is written to disk. Both servers must already be running (the parent or
 * the e2e runner starts them); the script never starts or stops a server.
 *
 * Spec (JSON):
 *   {
 *     "site": "http://localhost:4300/",                     // built site or dev server URL
 *     "mockup": "http://127.0.0.1:8791/Main.dc.html",       // local copy of the mockup board
 *     "viewports": [{ "width": 1440, "height": 900 }, { "width": 390, "height": 844 }],
 *     "siteHtml": { "data-theme": "light" },                // attributes set on <html> before reading
 *     "mockupHtml": { "data-theme": "jour" },
 *     "properties": ["font-size", "color"],                 // optional, defaults to DEFAULT_PROPERTIES
 *     "tolerancePx": 1,                                     // numeric tolerance for px values
 *     "pairs": [{ "name": "hero title", "site": "#hero h1", "mockup": ".ob-hero h1" }]
 *   }
 *
 * Exit status: 0 when every pair matches, 1 when a property differs or an element is missing, 2 on a
 * spec or browser error. The same file exists byte for byte in `.codex/scripts/style-diff.mjs`.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Constant DEFAULT_PROPERTIES
 *
 * @description
 * Properties compared when the spec names none: typography, colour, box and layout.
 */
export const DEFAULT_PROPERTIES = [
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'text-transform',
  'color',
  'background-color',
  'border-top-width',
  'border-top-color',
  'border-radius',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'gap',
  'opacity',
  'box.width',
  'box.height',
];

/**
 * Function parseSpec
 *
 * @description
 * Validates and completes a spec.
 *
 * @param {unknown} raw - Parsed JSON.
 * @returns {{ site: string, mockup: string, viewports: { width: number, height: number }[], siteHtml: Record<string, string>, mockupHtml: Record<string, string>, properties: string[], tolerancePx: number, pairs: { name: string, site: string, mockup: string, properties?: string[] }[] }} The spec with defaults.
 * @throws {Error} When a required field is missing or malformed.
 */
export function parseSpec(raw) {
  const spec = raw && typeof raw === 'object' ? raw : {};
  for (const key of ['site', 'mockup']) {
    if (typeof spec[key] !== 'string' || !/^https?:\/\//.test(spec[key])) {
      throw new Error(`spec.${key} must be an http(s) URL`);
    }
  }
  if (!Array.isArray(spec.pairs) || spec.pairs.length === 0) throw new Error('spec.pairs is empty');
  for (const pair of spec.pairs) {
    if (!pair || typeof pair.site !== 'string' || typeof pair.mockup !== 'string') {
      throw new Error('each pair needs a "site" and a "mockup" selector');
    }
  }
  const viewports = spec.viewports ?? [{ width: 1440, height: 900 }];
  if (!viewports.every((v) => Number.isInteger(v?.width) && Number.isInteger(v?.height))) {
    throw new Error('each viewport needs an integer width and height');
  }
  return {
    site: spec.site,
    mockup: spec.mockup,
    viewports,
    siteHtml: spec.siteHtml ?? {},
    mockupHtml: spec.mockupHtml ?? {},
    properties: spec.properties ?? DEFAULT_PROPERTIES,
    tolerancePx: Number.isFinite(spec.tolerancePx) ? spec.tolerancePx : 1,
    pairs: spec.pairs.map((pair, index) => ({ name: pair.name ?? `pair ${index + 1}`, ...pair })),
  };
}

/**
 * Function normalizeValue
 *
 * @description
 * Normalizes a computed value for comparison: collapsed whitespace, unified quotes, rounded numbers.
 *
 * @param {unknown} value - Computed value (string or number).
 * @returns {string} The normalized value.
 */
export function normalizeValue(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/"/g, "'")
    .replace(/(\d+\.\d{3})\d+/g, '$1');
}

/**
 * Function valuesMatch
 *
 * @description
 * Whether two computed values match: identical after normalization, or the same shape with every
 * number within `tolerancePx` (for px values and bare numbers such as box sizes).
 *
 * @param {unknown} a - Site value.
 * @param {unknown} b - Mockup value.
 * @param {number} tolerancePx - Allowed numeric difference.
 * @returns {boolean} True when the values match.
 */
export function valuesMatch(a, b, tolerancePx = 1) {
  const left = normalizeValue(a);
  const right = normalizeValue(b);
  if (left === right) return true;
  const number = /-?\d+(?:\.\d+)?/g;
  if (left.replace(number, '#') !== right.replace(number, '#')) return false;
  const ln = left.match(number) ?? [];
  const rn = right.match(number) ?? [];
  const pixels = /px|^-?\d+(?:\.\d+)?$/.test(left);
  return pixels && ln.every((n, i) => Math.abs(Number(n) - Number(rn[i])) <= tolerancePx);
}

/**
 * Function diffStyles
 *
 * @description
 * Lists the properties whose values differ between two style snapshots.
 *
 * @param {Record<string, unknown>} site - Site snapshot.
 * @param {Record<string, unknown>} mockup - Mockup snapshot.
 * @param {string[]} properties - Properties to compare.
 * @param {number} tolerancePx - Allowed numeric difference.
 * @returns {{ property: string, site: string, mockup: string }[]} The differences, in property order.
 */
export function diffStyles(site, mockup, properties, tolerancePx = 1) {
  return properties
    .filter((property) => !valuesMatch(site[property], mockup[property], tolerancePx))
    .map((property) => ({
      property,
      site: normalizeValue(site[property]),
      mockup: normalizeValue(mockup[property]),
    }));
}

/**
 * Function snapshot
 *
 * @description
 * Reads the computed style and box of the first element matching `selector` (runs in the page).
 *
 * @param {{ selector: string, properties: string[] }} args - Selector and properties.
 * @returns {Record<string, string | number> | null} The snapshot, or null when nothing matches.
 */
function snapshot({ selector, properties }) {
  const element = document.querySelector(selector);
  if (!element) return null;
  const style = getComputedStyle(element);
  const box = element.getBoundingClientRect();
  const result = {};
  for (const property of properties) {
    if (property === 'box.width') result[property] = Math.round(box.width * 10) / 10;
    else if (property === 'box.height') result[property] = Math.round(box.height * 10) / 10;
    else result[property] = style.getPropertyValue(property);
  }
  return result;
}

/**
 * Function open
 *
 * @description
 * Opens `url` at `viewport`, sets the <html> attributes, freezes motion and waits for the fonts.
 *
 * @param {import('@playwright/test').Browser} browser - Browser used to create an isolated context.
 * @param {string} url - Page URL to load.
 * @param {{width: number, height: number}} viewport - Viewport dimensions in pixels.
 * @param {Record<string, string>} attributes - Attributes applied to the root element.
 * @returns {Promise<{context: import('@playwright/test').BrowserContext, page: import('@playwright/test').Page}>} Loaded context and page.
 */
async function open(browser, url, viewport, attributes) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.addStyleTag({
    content: '*,*::before,*::after{transition:none!important;animation:none!important}',
  });
  await page.evaluate((attrs) => {
    for (const [name, value] of Object.entries(attrs))
      document.documentElement.setAttribute(name, value);
  }, attributes);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  return { context, page };
}

/**
 * Function compare
 *
 * @description
 * Runs the comparison described by `spec` with Playwright Chromium.
 *
 * @param {ReturnType<typeof parseSpec>} spec - Completed spec.
 * @returns {Promise<{ viewport: string, results: object[] }[]>} One entry per viewport.
 */
export async function compare(spec) {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  const report = [];
  try {
    for (const viewport of spec.viewports) {
      const site = await open(browser, spec.site, viewport, spec.siteHtml);
      const mockup = await open(browser, spec.mockup, viewport, spec.mockupHtml);
      const results = [];
      for (const pair of spec.pairs) {
        const properties = pair.properties ?? spec.properties;
        const left = await site.page.evaluate(snapshot, { selector: pair.site, properties });
        const right = await mockup.page.evaluate(snapshot, { selector: pair.mockup, properties });
        if (!left || !right) {
          results.push({ name: pair.name, missing: !left ? 'site' : 'mockup' });
          continue;
        }
        results.push({
          name: pair.name,
          diffs: diffStyles(left, right, properties, spec.tolerancePx),
        });
      }
      await site.context.close();
      await mockup.context.close();
      report.push({ viewport: `${viewport.width}x${viewport.height}`, results });
    }
  } finally {
    await browser.close();
  }
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const file = process.argv[2];
    if (!file) throw new Error('usage: node style-diff.mjs <spec.json>');
    const report = await compare(parseSpec(JSON.parse(readFileSync(file, 'utf8'))));
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    const clean = report.every((entry) =>
      entry.results.every((r) => !r.missing && r.diffs.length === 0),
    );
    process.exitCode = clean ? 0 : 1;
  } catch (error) {
    process.stderr.write(`style-diff: ${error.message}\n`);
    process.exitCode = 2;
  }
}
