// Markdown table of every coverage/**/coverage-summary.json (json-summary reporter), for the CI job summary.
//   node .github/scripts/coverage-summary.mjs [coverage directory]
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/**
 * Constant root
 *
 * @description
 * Coverage directory read from the first CLI argument, or the workspace default.
 */
const root = process.argv[2] ?? 'coverage';

/**
 * Function summaries
 *
 * @description
 * Walks subdirectories and yields the paths of JSON coverage summaries.
 *
 * @param {string} dir - Directory whose descendants are examined.
 * @returns {Generator<string>} Paths of discovered coverage summaries.
 */
function* summaries(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* summaries(path);
    else if (entry.name === 'coverage-summary.json') yield path;
  }
}

/**
 * Constant rows
 *
 * @description
 * Markdown rows built from each project summary; empty when the coverage directory does not exist.
 */
const rows = existsSync(root)
  ? [...summaries(root)].map((path) => {
      const { total } = JSON.parse(readFileSync(path, 'utf8'));
      const project = relative(root, join(path, '..')).split(sep).join('/');
      const cell = (metric) =>
        `${total[metric].pct}% (${total[metric].covered}/${total[metric].total})`;
      return `| ${project} | ${cell('lines')} | ${cell('branches')} | ${cell('functions')} |`;
    })
  : [];

console.log('### Coverage\n');
if (rows.length === 0) {
  console.log('No coverage summary found.');
} else {
  console.log('| Project | Lines | Branches | Functions |');
  console.log('| --- | --- | --- | --- |');
  for (const row of rows.sort()) console.log(row);
  console.log(
    '\nThresholds: docs/workspace/testing.md (a project below its threshold fails its test task).',
  );
}
