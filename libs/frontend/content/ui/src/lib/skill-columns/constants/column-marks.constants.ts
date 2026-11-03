import type { ColumnMark } from '@internal/content-web-ui/lib/skill-columns/models/column-mark/column-mark.interface';

/**
 * Constant COLUMN_MARKS
 *
 * @description
 * Cyclic glyph and aurora assignments for columns, ordered from pink through cyan.
 *
 * @type {readonly [ColumnMark, ...ColumnMark[]]}
 */
export const COLUMN_MARKS: readonly [ColumnMark, ...ColumnMark[]] = [
  { shape: 'dot', color: 'var(--aurora-pink)' },
  { shape: 'square', color: 'var(--aurora-violet)' },
  { shape: 'cross', color: 'var(--aurora-blue)' },
  { shape: 'dot', color: 'var(--aurora-cyan)' },
];
