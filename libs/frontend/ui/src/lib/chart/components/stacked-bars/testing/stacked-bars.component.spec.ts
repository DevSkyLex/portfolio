import { LOCALE_ID } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { StackedBarsComponent } from '@internal/ui/lib/chart/components/stacked-bars/stacked-bars.component';
import type { ChartLegendEntry } from '@internal/ui/lib/chart/models/chart/chart-legend-entry.interface';
import type { StackedBarRow } from '@internal/ui/lib/chart/models/chart/stacked-bar-row.interface';

/**
 * Constant LEGEND
 *
 * @description
 * Three severities in their status tones.
 */
const LEGEND: readonly ChartLegendEntry[] = [
  { key: 'error', label: 'Erreur', tone: 'danger' },
  { key: 'warning', label: 'Avertissement', tone: 'warning' },
  { key: 'info', label: 'Info', tone: 'info' },
];

/**
 * Constant ROWS
 *
 * @description
 * Two projects, the second without errors.
 */
const ROWS: readonly StackedBarRow[] = [
  {
    key: 'a',
    label: 'Movah',
    display: '4',
    segments: [
      { key: 'error', value: 1, display: '1' },
      { key: 'warning', value: 3, display: '3' },
    ],
  },
  { key: 'b', label: 'CRM', display: '2', segments: [{ key: 'info', value: 2, display: '2' }] },
];

/**
 * Function setup
 *
 * @description
 * Renders the bars in the French build.
 *
 * @param {readonly StackedBarRow[]} rows - Wholes.
 *
 * @returns {Promise<{ fixture: ComponentFixture<StackedBarsComponent>; host: HTMLElement; group: HTMLElement }>} Harness.
 */
async function setup(rows: readonly StackedBarRow[] = ROWS): Promise<{
  fixture: ComponentFixture<StackedBarsComponent>;
  host: HTMLElement;
  group: HTMLElement;
}> {
  TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'fr' }] });
  const fixture: ComponentFixture<StackedBarsComponent> =
    TestBed.createComponent(StackedBarsComponent);
  fixture.componentRef.setInput('rows', rows);
  fixture.componentRef.setInput('legend', LEGEND);
  fixture.componentRef.setInput('label', 'Problèmes par projet');
  await fixture.whenStable();
  const host: HTMLElement = fixture.nativeElement;
  const group: HTMLElement | null = host.querySelector<HTMLElement>('[role="group"]');
  if (!group) throw new Error('The group is missing.');
  return { fixture, host, group };
}

/**
 * Function parts
 *
 * @description
 * Drawn parts, row after row.
 *
 * @param {HTMLElement} host - Bars.
 *
 * @returns {HTMLElement[]} Parts.
 */
const parts = (host: HTMLElement): HTMLElement[] => [
  ...host.querySelectorAll<HTMLElement>('.text-on-fill'),
];

describe('StackedBarsComponent', (): void => {
  it('splits each whole in the legend order and tones, with a legend and a table', async (): Promise<void> => {
    const { host } = await setup();
    expect(host.getAttribute('data-slot')).toBe('stacked-bars');
    expect(
      [...host.querySelectorAll('[data-slot="chart-legend"] li')].map((li: Element) =>
        li.textContent?.trim(),
      ),
    ).toEqual(['Erreur', 'Avertissement', 'Info']);
    expect(parts(host).map((part: HTMLElement) => part.style.width)).toEqual([
      '25%',
      '75%',
      '100%',
    ]);
    expect(parts(host)[0]?.className).toContain('bg-danger');
    expect(parts(host)[2]?.className).toContain('bg-info');
    expect(host.querySelector('.h-2')).not.toBeNull();
    expect(
      [...host.querySelectorAll('tbody tr')].map((row: Element) =>
        [...row.children].map((cell: Element) => cell.textContent),
      ),
    ).toEqual([
      ['Movah', '1', '3', '0', '4'],
      ['CRM', '0', '0', '2', '2'],
    ]);
  });

  it('compares totals on one scale when absolute', async (): Promise<void> => {
    const { fixture, host } = await setup();
    fixture.componentRef.setInput('scale', 'absolute');
    await fixture.whenStable();
    expect(parts(host).map((part: HTMLElement) => part.style.width)).toEqual(['25%', '75%', '50%']);
  });

  it('prints the shares inside a tall whole where they fit, without a name row', async (): Promise<void> => {
    const { fixture, host } = await setup([
      {
        key: 'clicks',
        label: 'Clics',
        display: '100',
        segments: [
          { key: 'error', value: 90, display: '90' },
          { key: 'warning', value: 10, display: '10' },
        ],
      },
    ]);
    fixture.componentRef.setInput('size', 'tall');
    await fixture.whenStable();
    expect(host.querySelector('.h-8')).not.toBeNull();
    expect(
      parts(host).map((part: HTMLElement) => part.textContent?.replace(/\s+/g, ' ').trim()),
    ).toEqual(['90 %', '']);
    expect(host.textContent).not.toContain('Clics100');
  });

  it('names the hovered part with its amount and share, and walks the parts with the keyboard', async (): Promise<void> => {
    const { fixture, host, group } = await setup();
    const live = (): string | undefined =>
      host.querySelector('[aria-live="polite"]')?.textContent?.replace(/\s+/g, ' ').trim();
    parts(host)[1]?.dispatchEvent(new PointerEvent('pointerenter'));
    await fixture.whenStable();
    expect(live()).toBe('3 Avertissement · 75 % · Movah');
    expect(parts(host)[0]?.className).toContain('opacity-40');
    group.dispatchEvent(new PointerEvent('pointerleave'));
    await fixture.whenStable();
    expect(live()).toBe('');
    const key = async (name: string): Promise<KeyboardEvent> => {
      const event: KeyboardEvent = new KeyboardEvent('keydown', { key: name, cancelable: true });
      group.dispatchEvent(event);
      await fixture.whenStable();
      return event;
    };
    group.dispatchEvent(new FocusEvent('focus'));
    await fixture.whenStable();
    expect(live()).toBe('1 Erreur · 25 % · Movah');
    expect((await key('ArrowDown')).defaultPrevented).toBe(true);
    await key('ArrowRight');
    expect(live()).toBe('2 Info · 100 % · CRM');
    await key('End');
    await key('ArrowUp');
    await key('ArrowLeft');
    expect(live()).toBe('1 Erreur · 25 % · Movah');
    await key('Home');
    expect((await key('a')).defaultPrevented).toBe(false);
    await key('Escape');
    expect(live()).toBe('');
    group.dispatchEvent(new PointerEvent('pointerleave'));
    group.dispatchEvent(new FocusEvent('blur'));
    await fixture.whenStable();
    expect(live()).toBe('');
  });

  it('draws an empty whole without parts beside a measured one and keeps one entry without a legend', async (): Promise<void> => {
    const { fixture, host, group } = await setup([
      { key: 'a', label: 'Vide', display: '0', segments: [] },
      { key: 'b', label: 'CRM', display: '2', segments: [{ key: 'info', value: 2, display: '2' }] },
    ]);
    expect(parts(host)).toHaveLength(1);
    group.dispatchEvent(new FocusEvent('focus'));
    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'End' }));
    await fixture.whenStable();
    expect(
      host.querySelector('[aria-live="polite"]')?.textContent?.replace(/\s+/g, ' ').trim(),
    ).toBe('2 Info · 100 % · CRM');
    fixture.componentRef.setInput('legend', [LEGEND[0]]);
    fixture.componentRef.setInput('stale', true);
    await fixture.whenStable();
    expect(host.querySelector('[data-slot="chart-legend"]')).toBeNull();
    expect(host.hasAttribute('data-stale')).toBe(true);
  });

  it('keeps its room with a note on the empty surface when there is nothing to draw', async (): Promise<void> => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'fr' }] });
    const fixture: ComponentFixture<StackedBarsComponent> =
      TestBed.createComponent(StackedBarsComponent);
    // Wholes of zero have nothing to split either.
    fixture.componentRef.setInput('rows', [
      { key: 'a', label: 'Clics', display: '0', segments: [] },
    ]);
    fixture.componentRef.setInput('legend', []);
    fixture.componentRef.setInput('label', 'Appareils');
    await fixture.whenStable();
    const note: HTMLElement | null = (fixture.nativeElement as HTMLElement).querySelector('p');
    expect(note?.textContent?.trim()).toBe('Aucune donnée à afficher.');
    expect(note?.className).toContain('bg-surface-raised');
    expect(note?.className).toContain('h-20');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('table, ul, [role="group"]'),
    ).toBeNull();
  });
});
