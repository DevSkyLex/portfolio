import { LOCALE_ID } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { AreaChartComponent } from '@internal/ui/lib/chart/components/area-chart/area-chart.component';
import type { ChartPoint } from '@internal/ui/lib/chart/models/chart/chart-point.interface';

/**
 * Constant POINTS
 *
 * @description
 * Three days of clicks.
 */
const POINTS: readonly ChartPoint[] = [
  { label: '1 nov.', value: 4, display: '4' },
  { label: '2 nov.', value: 12, display: '12' },
  { label: '3 nov.', value: 7, display: '7' },
];

/**
 * Function setup
 *
 * @description
 * Renders the chart with the three days, in the French build.
 *
 * @returns {Promise<{ fixture: ComponentFixture<AreaChartComponent>; host: HTMLElement; plot: HTMLElement }>} Harness.
 */
async function setup(): Promise<{
  fixture: ComponentFixture<AreaChartComponent>;
  host: HTMLElement;
  plot: HTMLElement;
}> {
  TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'fr' }] });
  const fixture: ComponentFixture<AreaChartComponent> = TestBed.createComponent(AreaChartComponent);
  fixture.componentRef.setInput('points', POINTS);
  fixture.componentRef.setInput('label', 'Clics par jour');
  fixture.componentRef.setInput('valueHeader', 'Clics');
  await fixture.whenStable();
  const host: HTMLElement = fixture.nativeElement;
  const plot: HTMLElement | null = host.querySelector<HTMLElement>('[role="group"]');
  if (!plot) throw new Error('The plot is missing.');
  return { fixture, host, plot };
}

describe('AreaChartComponent', (): void => {
  it('names the plot, draws the line from the baseline ticks and keeps every value in a table', async (): Promise<void> => {
    const { host, plot } = await setup();
    expect(host.getAttribute('data-slot')).toBe('area-chart');
    expect(plot.getAttribute('aria-label')).toBe('Clics par jour');
    expect(plot.getAttribute('tabindex')).toBe('0');
    expect(document.getElementById(plot.getAttribute('aria-describedby') ?? '')?.textContent).toBe(
      'Flèches gauche et droite pour parcourir les valeurs.',
    );
    const paths: SVGPathElement[] = [...host.querySelectorAll<SVGPathElement>('svg path')];
    expect(paths).toHaveLength(2);
    // Ceiling 15 (steps of 5): 4 → 73.33, 12 → 20, 7 → 53.33.
    expect(paths[1]?.getAttribute('d')).toBe('M0.00 73.33 L500.00 20.00 L1000.00 53.33');
    expect(paths[0]?.getAttribute('d')).toContain('L1000.00 100 L0.00 100 Z');
    expect(paths[1]?.getAttribute('class')).toContain('stroke-aurora-violet');
    expect(
      [...host.querySelectorAll('[aria-hidden="true"] > span.tabular-nums')].map(
        (tick: Element): string | null => tick.textContent,
      ),
    ).toEqual(['0', '5', '10', '15']);
    const table: HTMLTableElement | null = host.querySelector('table');
    expect(table?.parentElement?.className).toBe('sr-only');
    expect(table?.querySelector('caption')?.textContent?.trim()).toBe('Clics par jour');
    expect(
      [...(table?.querySelectorAll('thead th') ?? [])].map((th: Element) => th.textContent),
    ).toEqual(['Date', 'Clics']);
    expect(
      [...(table?.querySelectorAll('tbody tr') ?? [])].map((row: Element) =>
        [...row.children].map((cell: Element) => cell.textContent),
      ),
    ).toEqual([
      ['1 nov.', '4'],
      ['2 nov.', '12'],
      ['3 nov.', '7'],
    ]);
  });

  it('labels the first, middle and last days, anchored inwards at the edges', async (): Promise<void> => {
    const { host } = await setup();
    const labels: HTMLElement[] = [
      ...host.querySelectorAll<HTMLElement>(':scope > div[aria-hidden="true"] > span'),
    ];
    expect(labels.map((label: HTMLElement) => label.textContent)).toEqual([
      '1 nov.',
      '2 nov.',
      '3 nov.',
    ]);
    expect(labels[0]?.className).toContain('translate-x-0');
    expect(labels[1]?.className).toContain('-translate-x-1/2');
    expect(labels[2]?.className).toContain('-translate-x-full');
    expect(labels[2]?.style.left).toBe('100%');
  });

  it('follows the pointer with a crosshair and a tooltip giving the value first', async (): Promise<void> => {
    const { fixture, host, plot } = await setup();
    plot.getBoundingClientRect = (): DOMRect => new DOMRect(0, 0, 200, 144);
    plot.dispatchEvent(new PointerEvent('pointermove', { clientX: 120 }));
    await fixture.whenStable();
    const tooltip: Element | null = host.querySelector('.shadow-float');
    expect(
      [...(tooltip?.querySelectorAll('span') ?? [])].map((span: Element) => span.textContent),
    ).toEqual(['', '12', '2 nov.']);
    expect(tooltip?.className).toContain('-translate-x-1/2');
    expect(host.querySelector<HTMLElement>('.bg-border-strong')?.style.left).toBe('50%');
    expect(host.querySelector('[aria-live="polite"]')?.textContent).toBe('2 nov., 12');
    plot.dispatchEvent(new PointerEvent('pointerleave'));
    await fixture.whenStable();
    expect(host.querySelector('.shadow-float')).toBeNull();
  });

  it('moves the readout with the keyboard from the latest day', async (): Promise<void> => {
    const { fixture, host, plot } = await setup();
    const live = (): string | null | undefined =>
      host.querySelector('[aria-live="polite"]')?.textContent;
    plot.dispatchEvent(new FocusEvent('focus'));
    await fixture.whenStable();
    expect(live()).toBe('3 nov., 7');
    const key = async (name: string): Promise<KeyboardEvent> => {
      const event: KeyboardEvent = new KeyboardEvent('keydown', { key: name, cancelable: true });
      plot.dispatchEvent(event);
      await fixture.whenStable();
      return event;
    };
    expect((await key('ArrowLeft')).defaultPrevented).toBe(true);
    expect(live()).toBe('2 nov., 12');
    await key('Home');
    expect(live()).toBe('1 nov., 4');
    await key('ArrowLeft');
    expect(live()).toBe('1 nov., 4');
    await key('End');
    expect(live()).toBe('3 nov., 7');
    expect((await key('a')).defaultPrevented).toBe(false);
    await key('Escape');
    expect(live()).toBe('');
    // The pointer leaving keeps a keyboard readout.
    await key('ArrowLeft');
    plot.dispatchEvent(new PointerEvent('pointerleave'));
    await fixture.whenStable();
    expect(live()).toBe('2 nov., 12');
    plot.dispatchEvent(new FocusEvent('blur'));
    await fixture.whenStable();
    expect(live()).toBe('');
  });

  it('dims a stale render and uses a caller tick format', async (): Promise<void> => {
    const { fixture, host } = await setup();
    fixture.componentRef.setInput('stale', true);
    fixture.componentRef.setInput('formatTick', (value: number): string => `${value} u`);
    await fixture.whenStable();
    expect(host.hasAttribute('data-stale')).toBe(true);
    expect(host.className).toContain('data-stale:opacity-50');
    expect(host.querySelector('[aria-hidden="true"] > span.tabular-nums')?.textContent).toBe('0 u');
  });

  it('keeps its room with a note on the empty surface when there is nothing to draw', async (): Promise<void> => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'fr' }] });
    const fixture: ComponentFixture<AreaChartComponent> =
      TestBed.createComponent(AreaChartComponent);
    fixture.componentRef.setInput('points', []);
    fixture.componentRef.setInput('label', 'Impressions');
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
