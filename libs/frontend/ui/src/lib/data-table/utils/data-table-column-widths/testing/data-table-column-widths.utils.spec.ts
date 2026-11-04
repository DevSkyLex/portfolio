import {
  clampWidth,
  contentWidth,
  keptColumnWidths,
  resizeDirection,
  storedColumnWidths,
} from '@internal/ui/lib/data-table/utils/data-table-column-widths/data-table-column-widths.utils';

describe('storedColumnWidths', (): void => {
  it('reads an object of positive pixel widths, rounded', (): void => {
    expect([...storedColumnWidths('{"title":240.4,"techs":180}')]).toEqual([
      ['title', 240],
      ['techs', 180],
    ]);
  });

  it('gives no width for an absent, malformed or non-object value and drops invalid entries', (): void => {
    expect(storedColumnWidths(null).size).toBe(0);
    expect(storedColumnWidths('{oops').size).toBe(0);
    expect(storedColumnWidths('[120]').size).toBe(0);
    expect(storedColumnWidths('42').size).toBe(0);
    expect([...storedColumnWidths('{"a":-1,"b":"9","c":0,"d":96}')]).toEqual([['d', 96]]);
  });

  it('clamps a width to its bounds, the minimum winning over a smaller maximum', (): void => {
    expect(clampWidth(30, 64, 640)).toBe(64);
    expect(clampWidth(900.6, 64, 640)).toBe(640);
    expect(clampWidth(100, 120, 80)).toBe(120);
  });
});

describe('keptColumnWidths', (): void => {
  it('keeps the widths of existing fixed resizable columns, within their bounds', (): void => {
    const kept: ReadonlyMap<string, number> = keptColumnWidths(
      new Map<string, number>([
        ['title', 300],
        ['status', 999],
        ['techs', 180],
        ['actions', 80],
        ['gone', 120],
      ]),
      [
        { id: 'title' },
        { id: 'status', width: 112 },
        { id: 'techs', width: 224 },
        { id: 'actions', width: 52, resizable: false },
      ],
      (column: { readonly id: string }): { readonly min: number; readonly max: number } =>
        column.id === 'status' ? { min: 88, max: 240 } : { min: 64, max: 640 },
    );
    expect([...kept]).toEqual([
      ['status', 240],
      ['techs', 180],
    ]);
  });
});

describe('resizeDirection', (): void => {
  it('widens an end-edge handle moved towards the end and a start-edge handle towards the start', (): void => {
    expect(resizeDirection('end', false)).toBe(1);
    expect(resizeDirection('start', false)).toBe(-1);
    expect(resizeDirection('end', true)).toBe(-1);
    expect(resizeDirection('start', true)).toBe(1);
  });
});

describe('contentWidth', (): void => {
  afterEach((): void => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it('reaches the farthest element box or overflow from the start edge, plus the end padding', (): void => {
    const cell: HTMLTableCellElement = document.createElement('td');
    cell.style.paddingLeft = '12px';
    cell.style.paddingRight = '8px';
    cell.innerHTML =
      '<div class="clip" style="overflow: hidden"><span class="badge">a</span></div>' +
      '<div class="block"></div><div data-skip><i>skip</i></div><b></b>' +
      '<div class="row" style="display: flex"><p class="item"></p></div>';
    document.body.append(cell);
    const rects: Map<string, DOMRect> = new Map<string, DOMRect>([
      ['TD', new DOMRect(100, 0, 120, 40)],
      ['clip', new DOMRect(112, 0, 100, 20)],
      ['badge', new DOMRect(112, 0, 60, 20)],
      // A block-level box stretched to the column says nothing of its content.
      ['block', new DOMRect(112, 0, 400, 20)],
      ['skip', new DOMRect(100, 0, 900, 20)],
      ['row', new DOMRect(112, 0, 400, 20)],
      // A flex item takes the size of its content.
      ['item', new DOMRect(112, 0, 170, 20)],
    ]);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ): DOMRect {
      return (
        rects.get(this.className) ??
        rects.get(this.hasAttribute('data-skip') ? 'skip' : this.tagName) ??
        new DOMRect(0, 0, 0, 0)
      );
    });
    // The clipping wrapper scrolls over 150 px of badges.
    vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(function (
      this: Element,
    ): number {
      return this.className === 'clip' ? 150 : 0;
    });
    // The clipped badges reach 12 + 150 px, the flex item 12 + 170 px, plus 8 px of end padding;
    // the stretched boxes, the skipped element and the box that is not rendered count for nothing.
    expect(contentWidth(cell, false, '[data-skip]')).toBe(190);
  });

  it('measures from the right edge in right-to-left text, and counts text through a range', (): void => {
    const cell: HTMLTableCellElement = document.createElement('td');
    cell.textContent = 'Châteauroux';
    cell.style.padding = '0px';
    document.body.append(cell);
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 100, 40),
    );
    const native: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(
      Range.prototype,
      'getBoundingClientRect',
    );
    Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: (): DOMRect => new DOMRect(-30, 0, 110, 20),
    });
    try {
      // The text runs from 100 (the cell's right edge) leftwards to -30.
      expect(contentWidth(cell, true, '[data-skip]')).toBe(130);
    } finally {
      if (native) Object.defineProperty(Range.prototype, 'getBoundingClientRect', native);
      else delete (Range.prototype as Partial<Range>).getBoundingClientRect;
    }
  });
});
