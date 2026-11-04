import { Component, LOCALE_ID, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { CalendarComponent } from '@internal/ui/lib/calendar/calendar.component';
import type { CalendarRange } from '@internal/ui/lib/calendar/models/calendar/calendar-range.interface';
import {
  addMonths,
  clampDay,
  compareDays,
  dayKey,
  firstDayOfWeek,
  monthGrid,
  rangeSpan,
  weekDays,
} from '@internal/ui/lib/calendar/utils/calendar/calendar.utils';

describe('calendar utils', () => {
  it('builds the weeks of a month from the first weekday', () => {
    // November 2026 starts on a Sunday.
    const weeks: Date[][] = monthGrid(new Date(2026, 10, 15), 1);
    expect(weeks).toHaveLength(6);
    expect(dayKey(weeks[0]?.[0] as Date)).toBe('2026-10-26');
    expect(dayKey(weeks[0]?.[6] as Date)).toBe('2026-11-01');
    expect(dayKey(weeks[5]?.[6] as Date)).toBe('2026-12-06');
    const sundayFirst: Date[][] = monthGrid(new Date(2026, 10, 15), 0);
    expect(sundayFirst).toHaveLength(5);
    expect(dayKey(sundayFirst[0]?.[0] as Date)).toBe('2026-11-01');
  });

  it('keeps the day within the target month when adding months', () => {
    expect(dayKey(addMonths(new Date(2026, 0, 31), 1))).toBe('2026-02-28');
    expect(dayKey(addMonths(new Date(2026, 2, 15), -14))).toBe('2025-01-15');
  });

  it('clamps a day to the bounds', () => {
    const min: Date = new Date(2026, 10, 10, 18);
    expect(dayKey(clampDay(new Date(2026, 10, 2), min))).toBe('2026-11-10');
    expect(dayKey(clampDay(new Date(2026, 10, 12, 9), min))).toBe('2026-11-12');
  });

  it('starts the week on Monday in French and on Sunday in US English', () => {
    expect(firstDayOfWeek('fr-FR')).toBe(1);
    expect(firstDayOfWeek('en-US')).toBe(0);
    expect(weekDays(1)[0]?.getDay()).toBe(1);
  });

  it('compares dates by day, whatever the time', () => {
    expect(compareDays(new Date(2026, 10, 5, 23), new Date(2026, 10, 5, 1))).toBe(0);
    expect(compareDays(new Date(2026, 10, 4, 23), new Date(2026, 10, 5))).toBeLessThan(0);
    expect(compareDays(new Date(2026, 10, 6), new Date(2026, 10, 5, 23))).toBeGreaterThan(0);
  });

  it('resolves the drawn span of a range, in order and at midnight', () => {
    /**
     * Function keys
     *
     * @description
     * Formats a span as its two day keys, or `null`.
     *
     * @param {{ start: Date; end: Date } | null} span - Span to format.
     * @returns {string[] | null} Start and end keys.
     */
    const keys = (span: { start: Date; end: Date } | null): string[] | null =>
      span && [dayKey(span.start), dayKey(span.end)];
    const start: Date = new Date(2026, 10, 5, 14);
    const end: Date = new Date(2026, 10, 10, 9);
    expect(keys(rangeSpan({ start, end }))).toEqual(['2026-11-05', '2026-11-10']);
    expect(keys(rangeSpan({ start: end, end: start }))).toEqual(['2026-11-05', '2026-11-10']);
    expect(rangeSpan({ start, end })?.start.getHours()).toBe(0);
    expect(rangeSpan({ start: null, end: null }, end)).toBeNull();
  });

  it('previews the end of a range from its start only, never before it', () => {
    const start: Date = new Date(2026, 10, 5);
    const later: Date = new Date(2026, 10, 12, 8);
    const earlier: Date = new Date(2026, 10, 2);
    expect(dayKey(rangeSpan({ start, end: null })?.end as Date)).toBe('2026-11-05');
    expect(dayKey(rangeSpan({ start, end: null }, later)?.end as Date)).toBe('2026-11-12');
    expect(dayKey(rangeSpan({ start, end: null }, earlier)?.end as Date)).toBe('2026-11-05');
    expect(dayKey(rangeSpan({ start, end: new Date(2026, 10, 7) }, later)?.end as Date)).toBe(
      '2026-11-07',
    );
    expect(dayKey(rangeSpan({ start: null, end: start }, later)?.start as Date)).toBe('2026-11-05');
  });
});

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Binds a selected date, month bounds, weekend exclusion and date-selection output to the calendar.
 */
@Component({
  imports: [CalendarComponent],
  template: `<ui-calendar
    [(value)]="value"
    [min]="min"
    [max]="max"
    [dateDisabled]="weekend"
    (dateSelect)="picked = $event"
  />`,
})
class HostComponent {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Selected date model initialized to November 2, 2026.
   *
   * @type {WritableSignal<Date | null>}
   */
  public readonly value: WritableSignal<Date | null> = signal<Date | null>(new Date(2026, 10, 2));

  /**
   * Property min
   * @readonly
   *
   * @description
   * Earliest selectable date used by the bounds interactions.
   *
   * @type {Date}
   */
  public readonly min: Date = new Date(2026, 9, 15);

  /**
   * Property max
   * @readonly
   *
   * @description
   * Latest selectable date used by the bounds interactions.
   *
   * @type {Date}
   */
  public readonly max: Date = new Date(2026, 11, 20);

  /**
   * Property weekend
   * @readonly
   *
   * @description
   * Marks Sunday and Saturday as unavailable to the calendar.
   *
   * @type {(date: Date) => boolean}
   */
  public readonly weekend: (date: Date) => boolean = (date: Date): boolean =>
    date.getDay() === 0 || date.getDay() === 6;

  /**
   * Property picked
   *
   * @description
   * Date emitted by the calendar after an available day is selected.
   *
   * @type {Date | null}
   */
  public picked: Date | null = null;
  // #endregion
}

/**
 * Function setup
 *
 * @description
 * Configures French locale, stabilizes the calendar fixture and exposes its grid and day controls.
 *
 * @returns Fixture, calendar elements, day lookup and keyboard interaction helpers.
 */
async function setup(): Promise<{
  fixture: ComponentFixture<HostComponent>;
  element: HTMLElement;
  grid: HTMLElement;
  day: (key: string) => HTMLButtonElement | null;
  press: (key: string, shiftKey?: boolean) => Promise<void>;
  host: HostComponent;
}> {
  TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'fr-FR' }] });
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  const grid: HTMLElement = element.querySelector('[role="grid"]') as HTMLElement;
  /**
   * Function day
   *
   * @description
   * Finds the calendar button representing one ISO date key.
   *
   * @param {string} key - Date key in `YYYY-MM-DD` format.
   * @returns {HTMLButtonElement | null} Matching day button when rendered.
   */
  const day = (key: string): HTMLButtonElement | null =>
    element.querySelector<HTMLButtonElement>(`[data-date="${key}"]`);

  /**
   * Function press
   *
   * @description
   * Dispatches a keyboard event to the active day button and waits for calendar state to settle.
   *
   * @param {string} key - Keyboard key name.
   * @param {boolean} shiftKey - Whether Shift modifies month navigation to change years.
   * @returns {Promise<void>}
   */
  const press = async (key: string, shiftKey: boolean = false): Promise<void> => {
    (document.activeElement as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();
  };
  return { fixture, element, grid, day, press, host: fixture.componentInstance };
}

describe('CalendarComponent', () => {
  it('renders a labelled grid that starts on Monday with the selected day', async () => {
    const { element, grid, day } = await setup();
    const heading: Element | null = element.querySelector(
      `#${grid.getAttribute('aria-labelledby')}`,
    );
    expect(heading?.textContent?.trim()).toBe('novembre 2026');
    expect(element.querySelector('th')?.getAttribute('abbr')).toBe('lundi');
    const selected: HTMLButtonElement | null = day('2026-11-02');
    expect(selected?.tabIndex).toBe(0);
    expect(selected?.parentElement?.getAttribute('aria-selected')).toBe('true');
    expect(selected?.getAttribute('aria-label')).toBe('lundi 2 novembre 2026');
    expect(day('2026-11-03')?.tabIndex).toBe(-1);
  });

  it('moves the focus with the APG date grid keys and stays within the bounds', async () => {
    const { element, day, press } = await setup();
    day('2026-11-02')?.focus();
    await press('ArrowRight');
    expect(document.activeElement).toBe(day('2026-11-03'));
    await press('ArrowDown');
    expect(document.activeElement).toBe(day('2026-11-10'));
    await press('End');
    expect(document.activeElement).toBe(day('2026-11-15'));
    await press('Home');
    expect(document.activeElement).toBe(day('2026-11-09'));
    await press('PageDown');
    expect(document.activeElement).toBe(day('2026-12-09'));
    expect(element.textContent).toContain('décembre 2026');
    await press('PageDown', true);
    expect(document.activeElement).toBe(day('2026-12-20'));
    await press('PageUp', true);
    expect(document.activeElement).toBe(day('2026-10-15'));
  });

  it('selects an available day and ignores unavailable ones', async () => {
    const { fixture, day, host } = await setup();
    day('2026-11-07')?.click();
    await fixture.whenStable();
    expect(day('2026-11-07')?.getAttribute('aria-disabled')).toBe('true');
    expect(host.value()?.getDate()).toBe(2);
    day('2026-11-05')?.click();
    await fixture.whenStable();
    expect(host.value()?.getDate()).toBe(5);
    expect(host.picked?.getDate()).toBe(5);
  });

  it('keeps the single-date cells free of range state, even under the pointer', async () => {
    const { fixture, element, day } = await setup();
    day('2026-11-12')?.dispatchEvent(new Event('pointerenter'));
    await fixture.whenStable();
    const cells: HTMLTableCellElement[] = Array.from(element.querySelectorAll('td'));
    expect(cells.every((cell) => cell.className === 'p-0.5 text-center')).toBe(true);
    expect(element.querySelectorAll('td[aria-selected]')).toHaveLength(1);
    expect(day('2026-11-02')?.className).toContain('rounded-md');
    expect(day('2026-11-02')?.className).not.toContain('rounded-e-none');
  });

  it('disables the month buttons past the bounds', async () => {
    const { fixture, element } = await setup();
    const [previous, next] = Array.from(
      element.querySelectorAll<HTMLButtonElement>('button[uiBtn]'),
    );
    expect(previous?.getAttribute('aria-label')).toBe('Mois précédent');
    previous?.click();
    await fixture.whenStable();
    expect(element.textContent).toContain('octobre 2026');
    expect(previous?.disabled).toBe(true);
    next?.click();
    next?.click();
    await fixture.whenStable();
    expect(element.textContent).toContain('décembre 2026');
    expect(next?.disabled).toBe(true);
  });
});

/**
 * Component RangeHostComponent
 * @class RangeHostComponent
 *
 * @description
 * Binds a range to the calendar, with Saturdays unavailable, and records the picked days.
 */
@Component({
  imports: [CalendarComponent],
  template: `<ui-calendar
    [range]="range()"
    [dateDisabled]="saturday"
    (dateSelect)="picked = $event"
  />`,
})
class RangeHostComponent {
  // #region Properties
  /**
   * Property range
   * @readonly
   *
   * @description
   * Range drawn by the calendar, November 5 to 10, 2026, by default.
   *
   * @type {WritableSignal<CalendarRange | null>}
   */
  public readonly range: WritableSignal<CalendarRange | null> = signal<CalendarRange | null>({
    start: new Date(2026, 10, 5),
    end: new Date(2026, 10, 10),
  });

  /**
   * Property saturday
   * @readonly
   *
   * @description
   * Marks Saturdays unavailable.
   *
   * @type {(date: Date) => boolean}
   */
  public readonly saturday: (date: Date) => boolean = (date: Date): boolean => date.getDay() === 6;

  /**
   * Property picked
   *
   * @description
   * Last day emitted by the calendar.
   *
   * @type {Date | null}
   */
  public picked: Date | null = null;
  // #endregion
}

/**
 * Function setupRange
 *
 * @description
 * Renders the range host in French, with another range when given, and exposes day and cell lookups.
 *
 * @param {CalendarRange | null} range - Range drawn instead of the default one.
 * @returns Fixture, host, day button and grid cell lookups, and the selected day keys.
 */
async function setupRange(range?: CalendarRange | null): Promise<{
  fixture: ComponentFixture<RangeHostComponent>;
  host: RangeHostComponent;
  element: HTMLElement;
  day: (key: string) => HTMLButtonElement;
  cell: (key: string) => HTMLTableCellElement;
  selected: () => string[];
}> {
  TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'fr-FR' }] });
  const fixture: ComponentFixture<RangeHostComponent> = TestBed.createComponent(RangeHostComponent);
  if (range !== undefined) fixture.componentInstance.range.set(range);
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  /**
   * Function day
   *
   * @description
   * Finds the button of a day.
   *
   * @param {string} key - Date key in `YYYY-MM-DD` format.
   * @returns {HTMLButtonElement} Day button.
   */
  const day = (key: string): HTMLButtonElement =>
    element.querySelector<HTMLButtonElement>(`[data-date="${key}"]`) as HTMLButtonElement;
  /**
   * Function cell
   *
   * @description
   * Finds the grid cell holding a day.
   *
   * @param {string} key - Date key in `YYYY-MM-DD` format.
   * @returns {HTMLTableCellElement} Grid cell.
   */
  const cell = (key: string): HTMLTableCellElement =>
    day(key).parentElement as HTMLTableCellElement;
  /**
   * Function selected
   *
   * @description
   * Lists the keys of the days whose grid cell is selected.
   *
   * @returns {string[]} Selected day keys in grid order.
   */
  const selected = (): string[] =>
    Array.from(element.querySelectorAll('td[aria-selected="true"] button')).map(
      (button) => button.getAttribute('data-date') ?? '',
    );
  return { fixture, host: fixture.componentInstance, element, day, cell, selected };
}

/**
 * Function classes
 *
 * @description
 * Lists the classes of an element, whatever their order.
 *
 * @param {Element} element - Inspected element.
 * @returns {string[]} Its classes.
 */
function classes(element: Element): string[] {
  return Array.from(element.classList);
}

describe('CalendarComponent in range mode', () => {
  it('fills the ends and joins them with a band of selected cells', async () => {
    const { day, cell, selected } = await setupRange();
    expect(selected()).toEqual([
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
      '2026-11-08',
      '2026-11-09',
      '2026-11-10',
    ]);
    expect(day('2026-11-05').className).toContain('bg-fill');
    expect(day('2026-11-05').className).toContain('rounded-e-none');
    expect(day('2026-11-10').className).toContain('bg-fill');
    expect(day('2026-11-10').className).toContain('rounded-s-none');
    expect(day('2026-11-06').className).not.toContain('bg-fill');
    expect(classes(cell('2026-11-05'))).toEqual(
      expect.arrayContaining([
        'p-0.5',
        'text-center',
        'before:bg-surface-selected',
        'before:start-1/2',
        'before:end-0',
      ]),
    );
    expect(classes(cell('2026-11-06'))).toEqual(
      expect.arrayContaining(['before:start-0', 'before:end-0']),
    );
    expect(classes(cell('2026-11-10'))).toEqual(
      expect.arrayContaining(['before:start-0', 'before:end-1/2']),
    );
    expect(cell('2026-11-04').className).toBe('p-0.5 text-center');
  });

  it('rounds the band where a week row cuts the range', async () => {
    const { cell } = await setupRange();
    // Sunday 8 closes a row and Monday 9 opens the next one.
    expect(classes(cell('2026-11-08'))).toEqual(
      expect.arrayContaining(['before:start-0', 'before:end-0.5', 'before:rounded-e-md']),
    );
    expect(classes(cell('2026-11-09'))).toEqual(
      expect.arrayContaining(['before:start-0.5', 'before:rounded-s-md', 'before:end-0']),
    );
  });

  it('draws a one-day range as a single filled day without a band', async () => {
    const date: Date = new Date(2026, 10, 12);
    const { day, cell, selected } = await setupRange({ start: date, end: date });
    expect(selected()).toEqual(['2026-11-12']);
    expect(cell('2026-11-12').className).toBe('p-0.5 text-center');
    expect(day('2026-11-12').className).toContain('bg-fill');
    expect(day('2026-11-12').className).not.toContain('rounded-e-none');
  });

  it('previews the range up to the day under the pointer, never before the start', async () => {
    const { fixture, element, day, selected } = await setupRange({
      start: new Date(2026, 10, 10),
      end: null,
    });
    expect(selected()).toEqual(['2026-11-10']);
    day('2026-11-13').dispatchEvent(new Event('pointerenter'));
    await fixture.whenStable();
    expect(selected()).toEqual(['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13']);
    expect(day('2026-11-13').className).toContain('bg-fill');
    day('2026-11-04').dispatchEvent(new Event('pointerenter'));
    await fixture.whenStable();
    expect(selected()).toEqual(['2026-11-10']);
    // Saturday 14 is unavailable: no preview up to it.
    day('2026-11-14').dispatchEvent(new Event('pointerenter'));
    await fixture.whenStable();
    expect(selected()).toEqual(['2026-11-10']);
    day('2026-11-12').dispatchEvent(new Event('pointerenter'));
    (element.querySelector('[role="grid"]') as HTMLElement).dispatchEvent(
      new Event('pointerleave'),
    );
    await fixture.whenStable();
    expect(selected()).toEqual(['2026-11-10']);
  });

  it('previews the range up to the day reached with the keyboard', async () => {
    const { fixture, day, selected } = await setupRange({
      start: new Date(2026, 10, 10),
      end: null,
    });
    day('2026-11-10').focus();
    (document.activeElement as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();
    expect(document.activeElement).toBe(day('2026-11-17'));
    expect(selected()).toHaveLength(8);
    expect(selected().at(-1)).toBe('2026-11-17');
  });

  it('ignores the preview once the end is chosen', async () => {
    const { fixture, day, selected } = await setupRange();
    day('2026-11-20').dispatchEvent(new Event('pointerenter'));
    await fixture.whenStable();
    expect(selected().at(-1)).toBe('2026-11-10');
  });

  it('emits a pick without writing its own value, the caller owning the range', async () => {
    const { fixture, host, day, selected } = await setupRange();
    day('2026-11-18').click();
    await fixture.whenStable();
    expect(dayKey(host.picked as Date)).toBe('2026-11-18');
    expect(selected()).not.toContain('2026-11-18');
    expect(day('2026-11-18').tabIndex).toBe(0);
  });

  it('places the grid on the range start', async () => {
    const { element } = await setupRange({ start: new Date(2027, 1, 3), end: null });
    expect(element.textContent).toContain('février 2027');
  });
});
