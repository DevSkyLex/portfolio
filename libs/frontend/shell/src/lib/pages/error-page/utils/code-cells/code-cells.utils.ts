import { DIGIT_GLYPHS } from '@internal/web-shell/lib/pages/error-page/constants/digit-glyphs.constants';
import type { CodeCell } from '@internal/web-shell/lib/pages/error-page/models/code-cell/code-cell.interface';
import type { CodeGrid } from '@internal/web-shell/lib/pages/error-page/models/code-grid/code-grid.interface';

/**
 * Function codeCells
 *
 * @description
 * Builds a seven-row bitmap grid with five columns per digit and one separator column between digits.
 * Unsupported digits remain unlit because they have no glyph pattern in the bitmap table.
 *
 * @param {string} code - Error code whose digits are rendered.
 *
 * @returns {CodeGrid} Grid width and row-major cell data.
 */
export function codeCells(code: string): CodeGrid {
  const digits: string[] = [...code];
  const columns: number = digits.length * 6 - 1;
  const cells: CodeCell[] = [];
  for (let row: number = 0; row < 7; row++) {
    for (let column: number = 0; column < columns; column++) {
      const x: number = column % 6;
      const glyph: readonly string[] = DIGIT_GLYPHS[digits[Math.floor(column / 6)] ?? '0'] ?? [];
      const on: boolean = x < 5 && glyph[row]?.[x] === '1';
      cells.push({
        state: x === 5 ? 'gap' : on ? 'on' : 'off',
        tint: column / (columns - 1),
        rank: column + row,
      });
    }
  }
  return { columns, cells };
}
