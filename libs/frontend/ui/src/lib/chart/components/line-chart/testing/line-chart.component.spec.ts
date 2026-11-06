import { LOCALE_ID } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { LineChartComponent } from '@internal/ui/lib/chart/components/line-chart/line-chart.component';
import type { ChartSeries } from '@internal/ui/lib/chart/models/chart/chart-series.interface';

/**
 * Constant SERIES
 *
 * @description
 * Users and sessions of three days.
 */
const SERIES: readonly ChartSeries[] = [
  {
    key: 'users',
    label: 'Utilisateurs',
    tone: 'chart-1',
    points: [
      { label: '1 nov.', value: 4, display: '4' },
      { label: '2 nov.', value: 6, display: '6' },
      { label: '3 nov.', value: 2, display: '2' },
    ],
  },
  {
    key: 'sessions',
    label: 'Sessions',
    tone: 'chart-2',
    points: [
      { label: '1 nov.', value: 5, display: '5' },
      { label: '2 nov.', value: 10, display: '10' },
      { label: '3 nov.', value: 3, display: '3' },
    ],
  },
];

/**
 * Function setup
 *
 * @description
 * Renders the chart with the given series, in the French build.
 *
 * @param {readonly ChartSeries[]} series - Series.
 *
 * @returns {Promise<{ fixture: ComponentFixture<LineChartComponent>; host: HTMLElement; plot: HTMLElement }>} Harness.
 */
async function setup(series: readonly ChartSeries[] = SERIES): Promise<{
  fixture: ComponentFixture<LineChartComponent>;
  host: HTMLElement;
  plot: HTMLElement;
}> {
  TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'fr' }] });
  const fixture: ComponentFixture<LineChartComponent> = TestBed.createComponent(LineChartComponent);
  fixture.componentRef.setInput('series', series);
  fixture.componentRef.setInput('label', 'Audience par jour');
  await fixture.whenStable();
  const host: HTMLElement = fixture.nativeElement;
  const plot: HTMLElement | null = host.querySelector<HTMLElement>('[role="group"]');
  if (!plot) throw new Error('The plot is missing.');
  return { fixture, host, plot };
}

describe('LineChartComponent', (): void => {
  it('draws every series on one scale with a legend and a table of all values', async (): Promise<void> => {
    const { host } = await setup();
    expect(host.getAttribute('data-slot')).toBe('line-chart');
    expect(
      [...host.querySelectorAll('[data-slot="chart-legend"] li')].map((li: Element) =>
        li.textContent?.trim(),
      ),
    ).toEqual(['Utilisateurs', 'Sessions']);
    const paths: SVGPathElement[] = [...host.querySelectorAll<SVGPathElement>('svg path')];
    // Ceiling 10 for both: 4 → y 60, 6 → 40, 2 → 80.
    expect(paths[0]?.getAttribute('d')).toBe('M0.00 60.00 L500.00 40.00 L1000.00 80.00');
    expect(paths[0]?.getAttribute('class')).toBe('stroke-chart-1');
    expect(paths[1]?.getAttribute('class')).toBe('stroke-chart-2');
    expect([...host.querySelectorAll('thead th')].map((th: Element) => th.textContent)).toEqual([
      'Date',
      'Utilisateurs',
      'Sessions',
    ]);
    expect(
      [...host.querySelectorAll('tbody tr')].map((row: Element) =>
        [...row.children].map((cell: Element) => cell.textContent),
      ),
    ).toEqual([
      ['1 nov.', '4', '5'],
      ['2 nov.', '6', '10'],
      ['3 nov.', '2', '3'],
    ]);
  });

  it('lists every series at the x under the pointer, with one ringed marker each', async (): Promise<void> => {
    const { fixture, host, plot } = await setup();
    plot.getBoundingClientRect = (): DOMRect => new DOMRect(0, 0, 200, 144);
    plot.dispatchEvent(new PointerEvent('pointermove', { clientX: 100 }));
    await fixture.whenStable();
    expect(host.querySelectorAll('.ring-surface')).toHaveLength(2);
    expect(
      [...(host.querySelector('.shadow-float')?.querySelectorAll(':scope > span') ?? [])].map(
        (row: Element) => row.textContent?.replace(/\s+/g, ' ').trim(),
      ),
    ).toEqual(['2 nov.', '6Utilisateurs', '10Sessions']);
    expect(host.querySelector('[aria-live="polite"]')?.textContent).toBe(
      '2 nov., Utilisateurs 6, Sessions 10',
    );
    plot.dispatchEvent(new PointerEvent('pointermove', { clientX: 0 }));
    await fixture.whenStable();
    expect(host.querySelector('.shadow-float')?.className).toContain('translate-x-0');
    plot.dispatchEvent(new PointerEvent('pointermove', { clientX: 200 }));
    await fixture.whenStable();
    expect(host.querySelector('.shadow-float')?.className).toContain('-translate-x-full');
    plot.dispatchEvent(new PointerEvent('pointerleave'));
    await fixture.whenStable();
    expect(host.querySelector('.shadow-float')).toBeNull();
  });

  it('draws one inverted series without a legend, zero at the top', async (): Promise<void> => {
    const { fixture, host, plot } = await setup([
      {
        key: 'position',
        label: 'Position',
        tone: 'chart-1',
        points: [
          { label: '1 nov.', value: 2, display: '2,0' },
          { label: '2 nov.', value: 8, display: '8,0' },
        ],
      },
    ]);
    fixture.componentRef.setInput('invert', true);
    await fixture.whenStable();
    expect(host.querySelector('[data-slot="chart-legend"]')).toBeNull();
    // Ceiling 10, inverted: 2 → y 20, 8 → y 80.
    expect(host.querySelector('svg path')?.getAttribute('d')).toBe('M0.00 20.00 L1000.00 80.00');
    plot.dispatchEvent(new FocusEvent('focus'));
    await fixture.whenStable();
    expect(host.querySelector('[aria-live="polite"]')?.textContent).toBe('2 nov., 8,0');
    expect(host.querySelector('.shadow-float')?.textContent).not.toContain('Position');
  });

  it('walks the days with the keyboard', async (): Promise<void> => {
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
    expect(live()).toBe('3 nov., Utilisateurs 2, Sessions 3');
    await key('Home');
    expect(live()).toBe('1 nov., Utilisateurs 4, Sessions 5');
    await key('ArrowRight');
    expect(live()).toBe('2 nov., Utilisateurs 6, Sessions 10');
    await key('End');
    await key('ArrowLeft');
    expect(live()).toBe('2 nov., Utilisateurs 6, Sessions 10');
    expect((await key('x')).defaultPrevented).toBe(false);
    await key('Escape');
    expect(live()).toBe('');
    plot.dispatchEvent(new PointerEvent('pointerleave'));
    plot.dispatchEvent(new FocusEvent('blur'));
    await fixture.whenStable();
    expect(live()).toBe('');
  });

  it('centres a single day, dims a stale render and ignores events without values', async (): Promise<void> => {
    const { fixture, host, plot } = await setup([
      {
        key: 'a',
        label: 'A',
        tone: 'chart-1',
        points: [{ label: '1 nov.', value: 3, display: '3' }],
      },
    ]);
    expect(host.querySelector('svg path')?.getAttribute('d')).toBe('M500.00 0.00');
    expect(
      host.querySelector<HTMLElement>(':scope > div[aria-hidden="true"] > span')?.className,
    ).toContain('-translate-x-1/2');
    fixture.componentRef.setInput('stale', true);
    fixture.componentRef.setInput('formatTick', (value: number): string => `${value} u`);
    await fixture.whenStable();
    expect(host.hasAttribute('data-stale')).toBe(true);
    expect(host.querySelector('[aria-hidden="true"] > span.tabular-nums')?.textContent).toBe('0 u');
    fixture.componentRef.setInput('series', []);
    await fixture.whenStable();
    plot.dispatchEvent(new PointerEvent('pointermove', { clientX: 10 }));
    plot.dispatchEvent(new FocusEvent('focus'));
    plot.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    await fixture.whenStable();
    expect(host.querySelector('.shadow-float')).toBeNull();
  });

  it('keeps its room with a note on the empty surface when there is nothing to draw', async (): Promise<void> => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'fr' }] });
    const fixture: ComponentFixture<LineChartComponent> =
      TestBed.createComponent(LineChartComponent);
    fixture.componentRef.setInput('series', []);
    fixture.componentRef.setInput('label', 'Audience');
    await fixture.whenStable();
    const note: HTMLElement | null = (fixture.nativeElement as HTMLElement).querySelector('p');
    expect(note?.textContent?.trim()).toBe('Aucune donnée à afficher.');
    expect(note?.className).toContain('bg-surface-raised');
    expect(note?.className).toContain('h-40');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('table, ul, [role="group"]'),
    ).toBeNull();
  });
});
