import { LOCALE_ID } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ScatterChartComponent } from '@internal/ui/lib/chart/components/scatter-chart/scatter-chart.component';
import type { ScatterPoint } from '@internal/ui/lib/chart/models/chart/scatter-point.interface';

/**
 * Constant POINTS
 *
 * @description
 * Three queries placed by position and CTR, out of x order.
 */
const POINTS: readonly ScatterPoint[] = [
  { key: 'b', label: 'portfolio', x: 8, y: 0.01, xDisplay: '8,0', yDisplay: '1 %' },
  { key: 'a', label: 'valentin fortin', x: 1, y: 0.3, xDisplay: '1,0', yDisplay: '30 %' },
  { key: 'c', label: 'angular', x: 4, y: 0.1, xDisplay: '4,0', yDisplay: '10 %' },
];

/**
 * Function setup
 *
 * @description
 * Renders the scatter with the three queries, in the French build.
 *
 * @param {readonly ScatterPoint[]} points - Items.
 *
 * @returns {Promise<{ fixture: ComponentFixture<ScatterChartComponent>; host: HTMLElement; plot: HTMLElement }>} Harness.
 */
async function setup(points: readonly ScatterPoint[] = POINTS): Promise<{
  fixture: ComponentFixture<ScatterChartComponent>;
  host: HTMLElement;
  plot: HTMLElement;
}> {
  TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'fr' }] });
  const fixture: ComponentFixture<ScatterChartComponent> =
    TestBed.createComponent(ScatterChartComponent);
  fixture.componentRef.setInput('points', points);
  fixture.componentRef.setInput('label', 'CTR selon la position');
  fixture.componentRef.setInput('xHeader', 'Position');
  fixture.componentRef.setInput('yHeader', 'CTR');
  fixture.componentRef.setInput('nameHeader', 'Requête');
  await fixture.whenStable();
  const host: HTMLElement = fixture.nativeElement;
  const plot: HTMLElement | null = host.querySelector<HTMLElement>('[role="group"]');
  if (!plot) throw new Error('The plot is missing.');
  plot.getBoundingClientRect = (): DOMRect => new DOMRect(0, 0, 200, 100);
  return { fixture, host, plot };
}

/**
 * Function dots
 *
 * @description
 * Drawn dots, in x order.
 *
 * @param {HTMLElement} host - Chart.
 *
 * @returns {HTMLElement[]} Dots.
 */
const dots = (host: HTMLElement): HTMLElement[] => [
  ...host.querySelectorAll<HTMLElement>('.rounded-full.ring-surface'),
];

describe('ScatterChartComponent', (): void => {
  it('places each item by both measures from zero and keeps them in a table', async (): Promise<void> => {
    const { host } = await setup();
    expect(host.getAttribute('data-slot')).toBe('scatter-chart');
    // x ceiling 8 (four steps of 2), y ceiling 0.3 (three steps of 0.1).
    expect(dots(host).map((dot: HTMLElement) => dot.style.left)).toEqual(['12.5%', '50%', '100%']);
    const bottoms: number[] = dots(host).map((dot: HTMLElement) =>
      Number.parseFloat(dot.style.bottom),
    );
    expect(bottoms[0]).toBeCloseTo(100, 4);
    expect(bottoms[1]).toBeCloseTo(33.333, 2);
    expect(bottoms[2]).toBeCloseTo(3.333, 2);
    expect(dots(host)[0]?.className).toContain('bg-chart-1');
    expect([...host.querySelectorAll('thead th')].map((th: Element) => th.textContent)).toEqual([
      'Requête',
      'Position',
      'CTR',
    ]);
    expect(
      [...host.querySelectorAll('tbody tr')].map((row: Element) =>
        [...row.children].map((cell: Element) => cell.textContent),
      ),
    ).toEqual([
      ['portfolio', '8,0', '1 %'],
      ['valentin fortin', '1,0', '30 %'],
      ['angular', '4,0', '10 %'],
    ]);
  });

  it('activates the point nearest to the pointer, wherever it is', async (): Promise<void> => {
    const { fixture, host, plot } = await setup();
    plot.dispatchEvent(new PointerEvent('pointermove', { clientX: 150, clientY: 90 }));
    await fixture.whenStable();
    expect(host.querySelector('[aria-live="polite"]')?.textContent).toBe(
      'portfolio, Position 8,0, CTR 1 %',
    );
    expect(dots(host)[2]?.className).toContain('scale-150');
    expect(dots(host)[0]?.className).toContain('opacity-40');
    expect(host.querySelector('.shadow-float')?.className).toContain('-translate-x-full');
    plot.dispatchEvent(new PointerEvent('pointermove', { clientX: 10, clientY: 0 }));
    await fixture.whenStable();
    expect(host.querySelector('.shadow-float')?.className).toContain('translate-x-0');
    plot.dispatchEvent(new PointerEvent('pointerleave'));
    await fixture.whenStable();
    expect(host.querySelector('.shadow-float')).toBeNull();
  });

  it('walks the points in x order with the keyboard', async (): Promise<void> => {
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
    expect(live()).toBe('valentin fortin, Position 1,0, CTR 30 %');
    expect((await key('ArrowRight')).defaultPrevented).toBe(true);
    expect(live()).toBe('angular, Position 4,0, CTR 10 %');
    await key('End');
    expect(live()).toBe('portfolio, Position 8,0, CTR 1 %');
    await key('Home');
    await key('ArrowLeft');
    expect(live()).toBe('valentin fortin, Position 1,0, CTR 30 %');
    expect((await key('q')).defaultPrevented).toBe(false);
    await key('Escape');
    expect(live()).toBe('');
    await key('ArrowRight');
    plot.dispatchEvent(new PointerEvent('pointerleave'));
    await fixture.whenStable();
    expect(live()).not.toBe('');
    plot.dispatchEvent(new FocusEvent('blur'));
    await fixture.whenStable();
    expect(live()).toBe('');
  });

  it('formats both axes, dims a stale render and ignores events without points', async (): Promise<void> => {
    const { fixture, host, plot } = await setup();
    fixture.componentRef.setInput('formatX', (value: number): string => `#${value}`);
    fixture.componentRef.setInput('formatY', (value: number): string => `${value * 100} %`);
    fixture.componentRef.setInput('stale', true);
    await fixture.whenStable();
    expect(host.hasAttribute('data-stale')).toBe(true);
    expect(host.textContent).toContain('#8');
    expect(host.textContent).toContain('30 %');
    fixture.componentRef.setInput('points', []);
    await fixture.whenStable();
    plot.dispatchEvent(new PointerEvent('pointermove', { clientX: 10, clientY: 10 }));
    plot.dispatchEvent(new FocusEvent('focus'));
    plot.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    await fixture.whenStable();
    expect(dots(host)).toEqual([]);
    expect(host.querySelector('.shadow-float')).toBeNull();
  });
});
