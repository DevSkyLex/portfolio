/**
 * Function timelineServerPath
 *
 * @description
 * Form field of a server error path of the timeline API: the start and end months are the one
 * `period` field (`start`, `start.month`, `end.year` → `period`), a technology index points at the
 * list (`techs.3` → `techs`); text paths (`title.en`) are already form paths.
 *
 * @param {string} path - `field` of a problem error.
 *
 * @returns {string} Form field path.
 */
export function timelineServerPath(path: string): string {
  if (/^(start|end)(?:\.(month|year))?$/.test(path)) return 'period';
  return path.replace(/^techs\.\d+$/, 'techs');
}
