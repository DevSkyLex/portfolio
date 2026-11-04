/**
 * Function toQrPath
 *
 * @description
 * Turns a QR module matrix into one SVG path in module units: each horizontal run of dark modules
 * becomes a rectangle, so the code renders as a single `<path>` without one element per module.
 *
 * @param {readonly (readonly boolean[])[]} modules - Rows of modules, `true` for dark.
 *
 * @returns {string} Path data (`M x y h n v 1 h -n z` per run), empty for an empty matrix.
 */
export function toQrPath(modules: readonly (readonly boolean[])[]): string {
  const runs: string[] = [];
  modules.forEach((row: readonly boolean[], y: number): void => {
    let start: number = -1;
    for (let x: number = 0; x <= row.length; x++) {
      const dark: boolean = row[x] === true;
      if (dark && start < 0) {
        start = x;
      } else if (!dark && start >= 0) {
        runs.push(`M${start} ${y}h${x - start}v1h-${x - start}z`);
        start = -1;
      }
    }
  });
  return runs.join('');
}
