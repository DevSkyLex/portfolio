import { codeCells } from '@internal/web-shell/lib/pages/error-page/utils/code-cells/code-cells.utils';

describe('codeCells', () => {
  it('draws three 5 × 7 digits separated by empty columns', () => {
    const { columns, cells }: ReturnType<typeof codeCells> = codeCells('404');
    expect(columns).toBe(17);
    expect(cells).toHaveLength(17 * 7);
    expect(cells[5]?.state).toBe('gap');

    // Top row of the 4: 00010.
    expect(cells.slice(0, 5).map((cell) => cell.state)).toEqual(['off', 'off', 'off', 'on', 'off']);
    expect(cells[0]?.tint).toBe(0);
    expect(cells[16]?.tint).toBe(1);
    expect(cells[17]?.rank).toBe(1);
  });

  it('leaves a digit without a drawing blank', () => {
    const { columns, cells }: ReturnType<typeof codeCells> = codeCells('7');
    expect(columns).toBe(5);
    expect(new Set(cells.map((cell) => cell.state))).toEqual(new Set(['off']));
  });
});
