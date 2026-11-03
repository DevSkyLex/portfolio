import { Component, LOCALE_ID, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { CalendarComponent } from '@internal/ui/lib/calendar/calendar.component';
import {
  addMonths,
  clampDay,
  dayKey,
  firstDayOfWeek,
  monthGrid,
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
