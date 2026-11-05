import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { HeatmapComponent } from '@internal/ui/lib/chart/components/heatmap/heatmap.component';
import type { HeatmapRow } from '@internal/ui/lib/chart/models/chart/heatmap-row.interface';

/**
 * Constant ROWS
 *
 * @description
 * Two weekdays over two weeks: a day outside the window, a zero and three counts.
 */
const ROWS: readonly HeatmapRow[] = [
  {
    key: 'mon',
    label: 'lun.',
    cells: [null, { label: 'lundi 9', value: 8, display: '8 sessions' }],
  },
  {
    key: 'tue',
    label: 'mar.',
    cells: [
      { label: 'mardi 3', value: 0, display: '0 session' },
      { label: 'mardi 10', value: 2, display: '2 sessions' },
    ],
  },
];

/**
 * Function setup
 *
 * @description
 * Renders the heatmap with the two weekdays.
 *
 * @param {readonly HeatmapRow[]} rows - Rows.
 *
 * @returns {Promise<{ fixture: ComponentFixture<HeatmapComponent>; host: HTMLElement; grid: HTMLElement }>} Harness.
 */
async function setup(rows: readonly HeatmapRow[] = ROWS): Promise<{
  fixture: ComponentFixture<HeatmapComponent>;
  host: HTMLElement;
  grid: HTMLElement;
}> {
  const fixture: ComponentFixture<HeatmapComponent> = TestBed.createComponent(HeatmapComponent);
  fixture.componentRef.setInput('rows', rows);
  fixture.componentRef.setInput('columns', ['3 nov.', '']);
  fixture.componentRef.setInput('label', 'Sessions par jour de la semaine');
  await fixture.whenStable();
  const host: HTMLElement = fixture.nativeElement;
  const grid: HTMLElement | null = host.querySelector<HTMLElement>('[role="group"]');
  if (!grid) throw new Error('The grid is missing.');
  return { fixture, host, grid };
}

/**
 * Function slots
 *
 * @description
 * Drawn slots, row after row.
 *
 * @param {HTMLElement} host - Heatmap.
 *
 * @returns {HTMLElement[]} Slots.
 */
const slots = (host: HTMLElement): HTMLElement[] => [
  ...host.querySelectorAll<HTMLElement>('[data-slot="heatmap-cell"]'),
];

describe('HeatmapComponent', (): void => {
  it('steps each cell on the ramp of the largest, leaves the window out and keeps a table', async (): Promise<void> => {
    const { host, grid } = await setup();
    expect(host.getAttribute('data-slot')).toBe('heatmap');
    expect(grid.getAttribute('aria-label')).toBe('Sessions par jour de la semaine');
    expect(grid.style.gridTemplateColumns).toBe('max-content repeat(2, minmax(0, 1fr))');
    const classes: string[] = slots(host).map((slot: HTMLElement) => slot.className);
    // No value and a zero both show the empty surface, like an empty day of a contribution graph.
    expect(classes[0]).toContain('bg-surface-raised');
    expect(classes[1]).toContain('bg-chart-1');
    expect(classes[1]).not.toContain('bg-chart-1/');
    expect(classes[2]).toContain('bg-surface-raised');
    // 2 of 8: the first of the four steps.
    expect(classes[3]).toContain('bg-chart-1/50');
    // Legend from the empty square to the full hue.
    const legend: string[] = [
      ...host.querySelectorAll<HTMLElement>('[aria-hidden="true"] .size-2\\.5'),
    ].map((swatch: HTMLElement): string => swatch.className);
    expect(legend).toHaveLength(5);
    expect(legend[0]).toContain('bg-surface-raised');
    expect(host.textContent).toContain('3 nov.');
    // A table ignores the 1 px height of sr-only: a hidden wrapper keeps a long window off the layout.
    expect(host.querySelector('table')?.parentElement?.className).toBe('sr-only');
    expect(
      [...host.querySelectorAll('tbody tr')].map((row: Element) =>
        [...row.children].map((cell: Element) => cell.textContent),
      ),
    ).toEqual([
      ['lundi 9', '8 sessions'],
      ['mardi 3', '0 session'],
      ['mardi 10', '2 sessions'],
    ]);
  });

  it('names the hovered cell under the grid and rings it', async (): Promise<void> => {
    const { fixture, host, grid } = await setup();
    slots(host)[3]?.dispatchEvent(new PointerEvent('pointerenter'));
    await fixture.whenStable();
    expect(
      host.querySelector('[aria-live="polite"]')?.textContent?.replace(/\s+/g, ' ').trim(),
    ).toBe('2 sessions mardi 10');
    expect(slots(host)[3]?.className).toContain('ring-2');
    slots(host)[0]?.dispatchEvent(new PointerEvent('pointerenter'));
    await fixture.whenStable();
    expect(host.querySelector('[aria-live="polite"]')?.textContent?.trim()).toBe('');
    grid.dispatchEvent(new PointerEvent('pointerleave'));
    await fixture.whenStable();
    expect(host.querySelector('.ring-2')).toBeNull();
  });

  it('moves through the grid with the arrows from the latest measured day', async (): Promise<void> => {
    const { fixture, host, grid } = await setup();
    const live = (): string | undefined =>
      host.querySelector('[aria-live="polite"]')?.textContent?.replace(/\s+/g, ' ').trim();
    const key = async (name: string): Promise<KeyboardEvent> => {
      const event: KeyboardEvent = new KeyboardEvent('keydown', { key: name, cancelable: true });
      grid.dispatchEvent(event);
      await fixture.whenStable();
      return event;
    };
    grid.dispatchEvent(new FocusEvent('focus'));
    await fixture.whenStable();
    expect(live()).toBe('2 sessions mardi 10');
    expect((await key('ArrowUp')).defaultPrevented).toBe(true);
    expect(live()).toBe('8 sessions lundi 9');
    await key('ArrowUp');
    await key('ArrowLeft');
    expect(live()).toBe('');
    await key('ArrowDown');
    expect(live()).toBe('0 session mardi 3');
    await key('ArrowRight');
    await key('ArrowRight');
    expect(live()).toBe('2 sessions mardi 10');
    expect((await key('Enter')).defaultPrevented).toBe(false);
    await key('Escape');
    expect(live()).toBe('');
    expect((await key('ArrowUp')).defaultPrevented).toBe(false);
    grid.dispatchEvent(new FocusEvent('blur'));
    grid.dispatchEvent(new FocusEvent('focus'));
    await fixture.whenStable();
    grid.dispatchEvent(new FocusEvent('focus'));
    grid.dispatchEvent(new PointerEvent('pointerleave'));
    await fixture.whenStable();
    expect(live()).toBe('2 sessions mardi 10');
  });

  it('draws an empty window flat and dims a stale render', async (): Promise<void> => {
    const { fixture, host, grid } = await setup([
      { key: 'mon', label: 'lun.', cells: [{ label: 'lundi', value: 0, display: '0' }, null] },
    ]);
    expect(slots(host)[0]?.className).toContain('bg-surface-raised');
    fixture.componentRef.setInput('rows', [{ key: 'mon', label: 'lun.', cells: [null] }]);
    fixture.componentRef.setInput('stale', true);
    await fixture.whenStable();
    expect(host.hasAttribute('data-stale')).toBe(true);
    grid.dispatchEvent(new FocusEvent('focus'));
    await fixture.whenStable();
    expect(host.querySelector('.ring-2')).toBeNull();
  });
});
