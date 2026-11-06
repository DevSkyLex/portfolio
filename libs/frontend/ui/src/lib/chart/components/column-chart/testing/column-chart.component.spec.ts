import { LOCALE_ID } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ColumnChartComponent } from '@internal/ui/lib/chart/components/column-chart/column-chart.component';
import type { ChartPoint } from '@internal/ui/lib/chart/models/chart/chart-point.interface';

/**
 * Constant POINTS
 *
 * @description
 * Four days of clicks, one of them without any.
 */
const POINTS: readonly ChartPoint[] = [
  { label: '1 nov.', value: 4, display: '4' },
  { label: '2 nov.', value: 12, display: '12' },
  { label: '3 nov.', value: 0, display: '0' },
  { label: '4 nov.', value: 7, display: '7' },
];

/**
 * Function setup
 *
 * @description
 * Renders the chart with the four days, in the French build.
 *
 * @param {readonly ChartPoint[]} points - Values.
 *
 * @returns {Promise<{ fixture: ComponentFixture<ColumnChartComponent>; host: HTMLElement; plot: HTMLElement }>} Harness.
 */
async function setup(points: readonly ChartPoint[] = POINTS): Promise<{
  fixture: ComponentFixture<ColumnChartComponent>;
  host: HTMLElement;
  plot: HTMLElement;
}> {
  TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'fr' }] });
  const fixture: ComponentFixture<ColumnChartComponent> =
    TestBed.createComponent(ColumnChartComponent);
  fixture.componentRef.setInput('points', points);
  fixture.componentRef.setInput('label', 'Clics par jour');
  fixture.componentRef.setInput('valueHeader', 'Clics');
  await fixture.whenStable();
  const host: HTMLElement = fixture.nativeElement;
  const plot: HTMLElement | null = host.querySelector<HTMLElement>('[role="group"]');
  if (!plot) throw new Error('The plot is missing.');
  return { fixture, host, plot };
}

/**
 * Function columns
 *
 * @description
 * Drawn columns, in x order; a zero leaves its slot empty.
 *
 * @param {HTMLElement} host - Chart.
 *
 * @returns {HTMLElement[]} Columns.
 */
const columns = (host: HTMLElement): HTMLElement[] => [
  ...host.querySelectorAll<HTMLElement>('.rounded-t-xs'),
];

describe('ColumnChartComponent', (): void => {
  it('draws one column per day from the zero baseline and keeps every value in a table', async (): Promise<void> => {
    const { host, plot } = await setup();
    expect(host.getAttribute('data-slot')).toBe('column-chart');
    expect(plot.getAttribute('aria-label')).toBe('Clics par jour');
    // Ceiling 15: 4 → 26.67 %, 12 → 80 %, 0 drawn as nothing, 7 → 46.67 %.
    const heights: number[] = columns(host).map((column: HTMLElement) =>
      Number.parseFloat(column.style.height),
    );
    expect(heights).toHaveLength(3);
    expect(heights[0]).toBeCloseTo(26.667, 2);
    expect(heights[1]).toBe(80);
    expect(heights[2]).toBeCloseTo(46.667, 2);
    expect(columns(host)[0]?.className).toContain('bg-chart-1');
    expect(host.querySelector('.gap-0\\.5')).not.toBeNull();
    expect(
      [...host.querySelectorAll('table tbody tr')].map((row: Element) =>
        [...row.children].map((cell: Element) => cell.textContent),
      ),
    ).toEqual([
      ['1 nov.', '4'],
      ['2 nov.', '12'],
      ['3 nov.', '0'],
      ['4 nov.', '7'],
    ]);
    expect(
      [...host.querySelectorAll(':scope > div[aria-hidden="true"] > span')].map(
        (label: Element) => label.textContent,
      ),
    ).toEqual(['1 nov.', '3 nov.', '4 nov.']);
  });

  it('keeps the column under the pointer and dims the others, with its value first', async (): Promise<void> => {
    const { fixture, host, plot } = await setup();
    plot.getBoundingClientRect = (): DOMRect => new DOMRect(0, 0, 200, 144);
    plot.dispatchEvent(new PointerEvent('pointermove', { clientX: 60 }));
    await fixture.whenStable();
    expect(
      columns(host).map((column: HTMLElement) => column.className.includes('opacity-40')),
    ).toEqual([true, false, true]);
    const tooltip: Element | null = host.querySelector('.shadow-float');
    expect([...(tooltip?.children ?? [])].map((span: Element) => span.textContent)).toEqual([
      '12',
      '2 nov.',
    ]);
    expect(host.querySelector('[aria-live="polite"]')?.textContent).toBe('2 nov., 12');
    plot.dispatchEvent(new PointerEvent('pointermove', { clientX: 500 }));
    await fixture.whenStable();
    expect(host.querySelector('[aria-live="polite"]')?.textContent).toBe('4 nov., 7');
    plot.dispatchEvent(new PointerEvent('pointerleave'));
    await fixture.whenStable();
    expect(host.querySelector('.shadow-float')).toBeNull();
  });

  it('walks the columns with the keyboard from the latest day', async (): Promise<void> => {
    const { fixture, host, plot } = await setup();
    const live = (): string | null | undefined =>
      host.querySelector('[aria-live="polite"]')?.textContent;
    const key = async (name: string): Promise<KeyboardEvent> => {
      const event: KeyboardEvent = new KeyboardEvent('keydown', { key: name, cancelable: true });
      plot.dispatchEvent(event);
      await fixture.whenStable();
      return event;
    };
    plot.dispatchEvent(new FocusEvent('focus'));
    await fixture.whenStable();
    expect(live()).toBe('4 nov., 7');
    expect((await key('ArrowLeft')).defaultPrevented).toBe(true);
    expect(live()).toBe('3 nov., 0');
    await key('Home');
    expect(live()).toBe('1 nov., 4');
    await key('End');
    await key('ArrowRight');
    expect(live()).toBe('4 nov., 7');
    expect((await key('a')).defaultPrevented).toBe(false);
    await key('Escape');
    expect(live()).toBe('');
    await key('ArrowRight');
    plot.dispatchEvent(new PointerEvent('pointerleave'));
    await fixture.whenStable();
    expect(live()).toBe('4 nov., 7');
    plot.dispatchEvent(new FocusEvent('blur'));
    await fixture.whenStable();
    expect(live()).toBe('');
  });

  it('narrows the gap past 45 columns, dims a stale render and takes a tone and tick format', async (): Promise<void> => {
    const many: ChartPoint[] = Array.from({ length: 46 }, (_: unknown, index: number) => ({
      label: `${index + 1}`,
      value: index,
      display: `${index}`,
    }));
    const { fixture, host } = await setup(many);
    expect(host.querySelector('.gap-px')).not.toBeNull();
    fixture.componentRef.setInput('stale', true);
    fixture.componentRef.setInput('tone', 'chart-2');
    fixture.componentRef.setInput('formatTick', (value: number): string => `${value} u`);
    await fixture.whenStable();
    expect(host.hasAttribute('data-stale')).toBe(true);
    expect(columns(host)[0]?.className).toContain('bg-chart-2');
    expect(host.querySelector('[aria-hidden="true"] > span.tabular-nums')?.textContent).toBe('0 u');
  });

  it('draws nothing to point at without values', async (): Promise<void> => {
    const { fixture, host, plot } = await setup([]);
    plot.dispatchEvent(new PointerEvent('pointermove', { clientX: 10 }));
    plot.dispatchEvent(new FocusEvent('focus'));
    plot.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    await fixture.whenStable();
    expect(columns(host)).toEqual([]);
    expect(host.querySelector('.shadow-float')).toBeNull();
  });
});
