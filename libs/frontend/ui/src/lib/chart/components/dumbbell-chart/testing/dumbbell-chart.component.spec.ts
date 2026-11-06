import { LOCALE_ID } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { DumbbellChartComponent } from '@internal/ui/lib/chart/components/dumbbell-chart/dumbbell-chart.component';
import type { DumbbellRow } from '@internal/ui/lib/chart/models/chart/dumbbell-row.interface';

/**
 * Constant ROWS
 *
 * @description
 * Two pages, the second measured on mobile only.
 */
const ROWS: readonly DumbbellRow[] = [
  {
    key: '/',
    label: '/',
    start: { value: 40, display: '40' },
    end: { value: 90, display: '90' },
  },
  { key: '/projects', label: '/projects', start: { value: 60, display: '60' }, end: null },
];

/**
 * Function setup
 *
 * @description
 * Renders the dumbbells in the French build.
 *
 * @returns {Promise<{ fixture: ComponentFixture<DumbbellChartComponent>; host: HTMLElement }>} Harness.
 */
async function setup(): Promise<{
  fixture: ComponentFixture<DumbbellChartComponent>;
  host: HTMLElement;
}> {
  TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'fr' }] });
  const fixture: ComponentFixture<DumbbellChartComponent> =
    TestBed.createComponent(DumbbellChartComponent);
  fixture.componentRef.setInput('rows', ROWS);
  fixture.componentRef.setInput('label', 'Score labo');
  fixture.componentRef.setInput('startLabel', 'Mobile');
  fixture.componentRef.setInput('endLabel', 'Ordinateur');
  await fixture.whenStable();
  return { fixture, host: fixture.nativeElement };
}

describe('DumbbellChartComponent', (): void => {
  it('places both measures of each item on a shared scale with every value printed', async (): Promise<void> => {
    const { host } = await setup();
    expect(host.getAttribute('data-slot')).toBe('dumbbell-chart');
    expect(
      [...host.querySelectorAll('[data-slot="chart-legend"] li')].map((li: Element) =>
        li.textContent?.trim(),
      ),
    ).toEqual(['Mobile', 'Ordinateur']);
    const rows: HTMLElement[] = [...host.querySelectorAll<HTMLElement>('ul[aria-label] > li')];
    expect(host.querySelector('ul[aria-label]')?.getAttribute('aria-label')).toBe('Score labo');
    expect(rows.map((row: HTMLElement) => row.textContent?.replace(/\s+/g, ''))).toEqual([
      '/Mobile40·Ordinateur90',
      '/projectsMobile60·Ordinateur—',
    ]);
    // Ceiling 100 from the values (four steps of 25).
    const first: HTMLElement[] = [
      ...(rows[0]?.querySelectorAll<HTMLElement>('.ring-surface') ?? []),
    ];
    expect(first.map((dot: HTMLElement) => dot.style.left)).toEqual(['40%', '90%']);
    expect(first[0]?.className).toContain('bg-chart-1');
    expect(first[1]?.className).toContain('bg-chart-2');
    expect(rows[0]?.querySelector<HTMLElement>('.bg-border-strong')?.style.width).toBe('50%');
    expect(rows[1]?.querySelector('.bg-border-strong')).toBeNull();
    expect(rows[1]?.querySelectorAll('.ring-surface')).toHaveLength(1);
  });

  it('takes a fixed top, a tick format and tones, and dims a stale render', async (): Promise<void> => {
    const { fixture, host } = await setup();
    fixture.componentRef.setInput('max', 200);
    fixture.componentRef.setInput('formatTick', (value: number): string => `${value} pts`);
    fixture.componentRef.setInput('startTone', 'chart-3');
    fixture.componentRef.setInput('endTone', 'muted');
    fixture.componentRef.setInput('stale', true);
    await fixture.whenStable();
    expect(host.hasAttribute('data-stale')).toBe(true);
    expect(host.textContent).toContain('200 pts');
    const dots: HTMLElement[] = [...host.querySelectorAll<HTMLElement>('li .ring-surface')];
    expect(dots[0]?.style.left).toBe('20%');
    expect(dots[0]?.className).toContain('bg-chart-3');
    expect(dots[1]?.className).toContain('bg-fg-faint');
    fixture.componentRef.setInput('rows', [{ key: 'x', label: 'x', start: null, end: null }]);
    fixture.componentRef.setInput('max', null);
    await fixture.whenStable();
    expect(host.querySelectorAll('li .ring-surface')).toHaveLength(0);
  });

  it('keeps its room with a note on the empty surface when there is nothing to draw', async (): Promise<void> => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'fr' }] });
    const fixture: ComponentFixture<DumbbellChartComponent> =
      TestBed.createComponent(DumbbellChartComponent);
    fixture.componentRef.setInput('rows', []);
    fixture.componentRef.setInput('label', 'Scores');
    fixture.componentRef.setInput('startLabel', 'Mobile');
    fixture.componentRef.setInput('endLabel', 'Ordinateur');
    await fixture.whenStable();
    const note: HTMLElement | null = (fixture.nativeElement as HTMLElement).querySelector('p');
    expect(note?.textContent?.trim()).toBe('Aucune donnée à afficher.');
    expect(note?.className).toContain('bg-surface-raised');
    expect(note?.className).toContain('h-24');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('table, ul, [role="group"]'),
    ).toBeNull();
  });
});
