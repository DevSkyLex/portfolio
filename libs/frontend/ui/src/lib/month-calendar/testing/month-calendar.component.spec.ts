import { Component, LOCALE_ID, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { MonthCalendarComponent } from '@internal/ui/lib/month-calendar/month-calendar.component';
import type { MonthCalendarRange } from '@internal/ui/lib/month-calendar/models/month-calendar-range/month-calendar-range.interface';
import type { MonthCalendarUnit } from '@internal/ui/lib/month-calendar/models/month-calendar-unit/month-calendar-unit.type';
import type { PeriodBound } from '@internal/ui/lib/month-calendar/models/period-bound/period-bound.interface';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Binds the unit, value, range and bounds of a month calendar and records its choices.
 */
@Component({
  imports: [MonthCalendarComponent],
  template: `<ui-month-calendar
    [unit]="unit()"
    [value]="value()"
    [range]="range()"
    [min]="min()"
    [max]="max()"
    (cellSelect)="chosen.push($event)"
  />`,
})
class HostComponent {
  // #region Properties
  /**
   * Property unit
   * @readonly
   *
   * @description
   * Unit of the cells.
   *
   * @type {WritableSignal<MonthCalendarUnit>}
   */
  public readonly unit: WritableSignal<MonthCalendarUnit> = signal<MonthCalendarUnit>('month');

  /**
   * Property value
   * @readonly
   *
   * @description
   * Single value.
   *
   * @type {WritableSignal<PeriodBound | null>}
   */
  public readonly value: WritableSignal<PeriodBound | null> = signal<PeriodBound | null>(null);

  /**
   * Property range
   * @readonly
   *
   * @description
   * Range drawn.
   *
   * @type {WritableSignal<MonthCalendarRange | null>}
   */
  public readonly range: WritableSignal<MonthCalendarRange | null> =
    signal<MonthCalendarRange | null>(null);

  /**
   * Property min
   * @readonly
   *
   * @description
   * Lower bound.
   *
   * @type {WritableSignal<PeriodBound | undefined>}
   */
  public readonly min: WritableSignal<PeriodBound | undefined> = signal<PeriodBound | undefined>(
    undefined,
  );

  /**
   * Property max
   * @readonly
   *
   * @description
   * Upper bound.
   *
   * @type {WritableSignal<PeriodBound | undefined>}
   */
  public readonly max: WritableSignal<PeriodBound | undefined> = signal<PeriodBound | undefined>(
    undefined,
  );

  /**
   * Property chosen
   * @readonly
   *
   * @description
   * Cells emitted, oldest first.
   *
   * @type {PeriodBound[]}
   */
  public readonly chosen: PeriodBound[] = [];
  // #endregion
}

/**
 * Function setup
 *
 * @description
 * Mounts the host in French on 4 November 2026 (only `Date` is faked).
 *
 * @returns {Promise<{ fixture: ComponentFixture<HostComponent>; host: HostComponent; root: HTMLElement }>} Handles.
 */
async function setup(): Promise<{
  fixture: ComponentFixture<HostComponent>;
  host: HostComponent;
  root: HTMLElement;
}> {
  TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'fr-FR' }] });
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  return { fixture, host: fixture.componentInstance, root: fixture.nativeElement };
}

/**
 * Function cell
 *
 * @description
 * Cell button by key (`yyyy-mm` or `yyyy`).
 *
 * @param {HTMLElement} root - Host element.
 * @param {string} key - Cell key.
 *
 * @returns {HTMLButtonElement} Cell.
 */
const cell = (root: HTMLElement, key: string): HTMLButtonElement => {
  const found: HTMLButtonElement | null = root.querySelector<HTMLButtonElement>(
    `[data-cell="${key}"]`,
  );
  if (!found) throw new Error(`No cell ${key}`);
  return found;
};

/**
 * Function marked
 *
 * @description
 * Keys of the cells whose grid cell is `aria-selected` (ends and inside of the range).
 *
 * @param {HTMLElement} root - Host element.
 *
 * @returns {string[]} Keys.
 */
const marked = (root: HTMLElement): string[] =>
  [...root.querySelectorAll('[role="gridcell"][aria-selected="true"] button')].map(
    (button: Element): string => button.getAttribute('data-cell') ?? '',
  );

/**
 * Function press
 *
 * @description
 * Presses a key on the focused cell.
 *
 * @param {string} key - Key value.
 *
 * @returns {void}
 */
const press = (key: string): void => {
  document.activeElement?.dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  );
};

describe('MonthCalendarComponent', (): void => {
  beforeEach((): void => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 4));
  });

  afterEach((): void => {
    vi.useRealTimers();
  });

  it('shows the months of the year in rows of four, the current one marked', async (): Promise<void> => {
    const { root } = await setup();
    expect(root.querySelector('[aria-live]')?.textContent?.trim()).toBe('2026');
    expect(root.querySelectorAll('[role="row"]')).toHaveLength(3);
    expect(root.querySelectorAll('[role="row"]')[0]?.querySelectorAll('button')).toHaveLength(4);
    expect(cell(root, '2026-01').textContent?.trim()).toBe('Janv.');
    expect(cell(root, '2026-01').getAttribute('aria-label')).toBe('janvier 2026');
    expect(cell(root, '2026-11').getAttribute('aria-current')).toBe('date');
    expect(cell(root, '2026-11').getAttribute('tabindex')).toBe('0');
    expect(cell(root, '2026-10').getAttribute('tabindex')).toBe('-1');
  });

  it('moves the tab stop with the arrows, the row edges and the pages', async (): Promise<void> => {
    const { fixture, host, root } = await setup();
    host.value.set({ year: 2026, month: 3 });
    await fixture.whenStable();
    cell(root, '2026-03').focus();
    press('ArrowRight');
    await fixture.whenStable();
    expect(document.activeElement?.getAttribute('data-cell')).toBe('2026-04');
    press('ArrowDown');
    await fixture.whenStable();
    expect(document.activeElement?.getAttribute('data-cell')).toBe('2026-08');
    press('Home');
    await fixture.whenStable();
    expect(document.activeElement?.getAttribute('data-cell')).toBe('2026-05');
    press('End');
    await fixture.whenStable();
    expect(document.activeElement?.getAttribute('data-cell')).toBe('2026-08');
    press('PageDown');
    await fixture.whenStable();
    expect(document.activeElement?.getAttribute('data-cell')).toBe('2027-08');
    expect(root.querySelector('[aria-live]')?.textContent?.trim()).toBe('2027');
    // A row up twice crosses back into the previous year.
    press('ArrowUp');
    press('ArrowUp');
    await fixture.whenStable();
    expect(document.activeElement?.getAttribute('data-cell')).toBe('2026-12');
  });

  it('disables the months outside the bounds and the pages beyond them', async (): Promise<void> => {
    const { fixture, host, root } = await setup();
    host.min.set({ year: 2026, month: 3 });
    host.max.set({ year: 2026, month: 11 });
    await fixture.whenStable();
    expect(cell(root, '2026-02').getAttribute('aria-disabled')).toBe('true');
    expect(cell(root, '2026-12').getAttribute('aria-disabled')).toBe('true');
    const [previous, next] = [...root.querySelectorAll<HTMLButtonElement>('button[aria-label]')]
      .filter((button) => !button.hasAttribute('data-cell'))
      .map((button) => button.disabled);
    expect([previous, next]).toEqual([true, true]);
    cell(root, '2026-02').click();
    cell(root, '2026-05').click();
    expect(host.chosen).toEqual([{ year: 2026, month: 5 }]);
  });

  it('draws a range, previews its end from the pointer, and an ongoing one to now', async (): Promise<void> => {
    const { fixture, host, root } = await setup();
    host.range.set({ start: { year: 2026, month: 3 }, end: null });
    await fixture.whenStable();
    expect(marked(root)).toEqual(['2026-03']);
    cell(root, '2026-06').dispatchEvent(new Event('pointerenter'));
    await fixture.whenStable();
    expect(marked(root)).toEqual(['2026-03', '2026-04', '2026-05', '2026-06']);
    // A preview before the start draws nothing.
    cell(root, '2026-01').dispatchEvent(new Event('pointerenter'));
    await fixture.whenStable();
    expect(marked(root)).toEqual(['2026-03']);

    host.range.set({ start: { year: 2026, month: 8 }, end: null, ongoing: true });
    await fixture.whenStable();
    expect(marked(root)).toEqual(['2026-08', '2026-09', '2026-10', '2026-11']);
  });

  it('shows pages of twelve years in the year unit and emits whole years', async (): Promise<void> => {
    const { fixture, host, root } = await setup();
    host.unit.set('year');
    host.range.set({ start: { year: 2023, month: null }, end: { year: 2025, month: null } });
    await fixture.whenStable();
    expect(root.querySelector('[aria-live]')?.textContent?.trim()).toBe('2016 – 2027');
    expect(marked(root)).toEqual(['2023', '2024', '2025']);
    cell(root, '2019').click();
    expect(host.chosen).toEqual([{ year: 2019, month: null }]);
  });
});
