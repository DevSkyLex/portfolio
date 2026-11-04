import { Component, LOCALE_ID, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import {
  FormField,
  form,
  required,
  type FieldTree,
  type PathKind,
  type SchemaPathTree,
} from '@angular/forms/signals';
import { dayKey } from '@internal/ui/lib/calendar/utils/calendar/calendar.utils';
import { DateRangePickerComponent } from '@internal/ui/lib/date-range-picker/date-range-picker.component';
import type { DateRange } from '@internal/ui/lib/date-range-picker/models/date-range/date-range.interface';
import { FieldComponent } from '@internal/ui/lib/field/field.component';

/**
 * Interface StayModel
 *
 * @description
 * Form model of the Signal Forms host.
 */
interface StayModel {
  stay: DateRange | null;
}

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Binds a range two ways and records whether the picker reports the control as touched.
 */
@Component({
  imports: [DateRangePickerComponent],
  template: `<ui-date-range-picker triggerId="stay" [(value)]="value" (touch)="touched = true" />`,
})
class HostComponent {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Range bound to the picker, November 2 to 4, 2026, by default so that the grid opens on that month.
   *
   * @type {WritableSignal<DateRange | null>}
   */
  public readonly value: WritableSignal<DateRange | null> = signal<DateRange | null>({
    start: new Date(2026, 10, 2),
    end: new Date(2026, 10, 4),
  });

  /**
   * Property touched
   *
   * @description
   * Records the picker's touch notification.
   *
   * @type {boolean}
   */
  public touched: boolean = false;
  // #endregion
}

/**
 * Component FormHostComponent
 * @class FormHostComponent
 *
 * @description
 * Binds the picker to a required Signal Forms field, with a button to move the focus to.
 */
@Component({
  imports: [DateRangePickerComponent, FormField],
  template: `
    <ui-date-range-picker
      triggerId="stay"
      [minDate]="min"
      [maxDate]="max"
      [formField]="booking.stay"
    />
    <button type="button" id="after">Après</button>
  `,
})
class FormHostComponent {
  // #region Properties
  /**
   * Property min
   * @readonly
   *
   * @description
   * Earliest day; with `max`, it keeps the grid on November 2026 whatever the current date.
   *
   * @type {Date}
   */
  public readonly min: Date = new Date(2026, 10, 1);

  /**
   * Property max
   * @readonly
   *
   * @description
   * Latest day.
   *
   * @type {Date}
   */
  public readonly max: Date = new Date(2026, 10, 30);

  /**
   * Property model
   * @readonly
   *
   * @description
   * Source model of the form, without a range.
   *
   * @type {WritableSignal<StayModel>}
   */
  public readonly model: WritableSignal<StayModel> = signal<StayModel>({ stay: null });

  /**
   * Property booking
   * @readonly
   *
   * @description
   * Form tree requiring a range.
   *
   * @type {FieldTree<StayModel, string | number, 'writable'>}
   */
  public readonly booking: FieldTree<StayModel, string | number, 'writable'> = form(
    this.model,
    (path: SchemaPathTree<StayModel, PathKind.Root>): void => required(path.stay),
  );
  // #endregion
}

/**
 * Component FieldHostComponent
 * @class FieldHostComponent
 *
 * @description
 * Places the picker in a `ui-field` whose error is driven by the test.
 */
@Component({
  imports: [DateRangePickerComponent, FieldComponent],
  template: `
    <ui-field label="Séjour" controlId="stay" [error]="error()">
      <ui-date-range-picker triggerId="stay" />
    </ui-field>
  `,
})
class FieldHostComponent {
  // #region Properties
  /**
   * Property error
   * @readonly
   *
   * @description
   * Message shown by the field.
   *
   * @type {WritableSignal<string | null>}
   */
  public readonly error: WritableSignal<string | null> = signal<string | null>(null);
  // #endregion
}

/**
 * Function dialog
 *
 * @description
 * Finds the open calendar dialog in the overlay container.
 *
 * @returns {HTMLElement | null} Dialog, or `null` while closed.
 */
function dialog(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.cdk-overlay-container [role="dialog"]');
}

/**
 * Function day
 *
 * @description
 * Finds a day button of the open dialog.
 *
 * @param {string} key - Date key in `YYYY-MM-DD` format.
 * @returns {HTMLButtonElement} Day button.
 */
function day(key: string): HTMLButtonElement {
  return dialog()?.querySelector<HTMLButtonElement>(`[data-date="${key}"]`) as HTMLButtonElement;
}

/**
 * Function selected
 *
 * @description
 * Lists the keys of the selected days of the open dialog.
 *
 * @returns {string[]} Selected day keys in grid order.
 */
function selected(): string[] {
  return Array.from(dialog()?.querySelectorAll('td[aria-selected="true"] button') ?? []).map(
    (button) => button.getAttribute('data-date') ?? '',
  );
}

/**
 * Function status
 *
 * @description
 * Reads the status line of the open dialog.
 *
 * @returns {string | undefined} Status text.
 */
function status(): string | undefined {
  return dialog()?.querySelector('p[aria-live="polite"]')?.textContent?.trim();
}

/**
 * Function keys
 *
 * @description
 * Formats a range as its two day keys.
 *
 * @param {DateRange | null} range - Range to format.
 * @returns {string[] | null} Start and end keys, or `null`.
 */
function keys(range: DateRange | null): string[] | null {
  return range && [dayKey(range.start), dayKey(range.end)];
}

/**
 * Function render
 *
 * @description
 * Renders a host in French and returns it with the picker trigger.
 *
 * @param {new () => T} host - Host component.
 * @returns Fixture and trigger.
 */
async function render<T>(
  host: new () => T,
): Promise<{ fixture: ComponentFixture<T>; trigger: HTMLButtonElement }> {
  TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'fr-FR' }] });
  const fixture: ComponentFixture<T> = TestBed.createComponent(host);
  await fixture.whenStable();
  const trigger: HTMLButtonElement = (fixture.nativeElement as HTMLElement).querySelector(
    '#stay',
  ) as HTMLButtonElement;
  return { fixture, trigger };
}

/**
 * Function setup
 *
 * @description
 * Renders the two-way host with an optional initial range.
 *
 * @param {DateRange | null} value - Initial range, the November 2 to 4 one when omitted.
 * @returns Fixture, trigger, host and a helper clicking a day of the open dialog.
 */
async function setup(value?: DateRange | null): Promise<{
  fixture: ComponentFixture<HostComponent>;
  trigger: HTMLButtonElement;
  host: HostComponent;
  pick: (key: string) => Promise<void>;
}> {
  const { fixture, trigger } = await render(HostComponent);
  if (value !== undefined) {
    fixture.componentInstance.value.set(value);
    await fixture.whenStable();
  }
  /**
   * Function pick
   *
   * @description
   * Clicks a day of the open dialog and lets the picker settle.
   *
   * @param {string} key - Date key in `YYYY-MM-DD` format.
   * @returns {Promise<void>}
   */
  const pick = async (key: string): Promise<void> => {
    day(key).click();
    await fixture.whenStable();
  };
  return { fixture, trigger, host: fixture.componentInstance, pick };
}

/**
 * Function escape
 *
 * @description
 * Presses Escape on the focused element.
 *
 * @returns {void}
 */
function escape(): void {
  (document.activeElement as HTMLElement).dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true, cancelable: true }),
  );
}

describe('DateRangePickerComponent', () => {
  it('shows the placeholder, then the range formatted by the locale', async () => {
    const { fixture, trigger, host } = await setup(null);
    expect(trigger.textContent?.trim()).toBe('Choisir des dates');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.className).toContain('text-fg-faint');
    host.value.set({ start: new Date(2026, 2, 3), end: new Date(2026, 2, 18) });
    await fixture.whenStable();
    expect(trigger.textContent?.trim()).toBe('3–18 mars 2026');
    host.value.set({ start: new Date(2026, 2, 28), end: new Date(2026, 3, 2) });
    await fixture.whenStable();
    expect(trigger.textContent?.trim()).toBe('28 mars – 2 avril 2026');
    host.value.set({ start: new Date(2026, 2, 3), end: new Date(2026, 2, 3) });
    await fixture.whenStable();
    expect(trigger.textContent?.trim()).toBe('3 mars 2026');
  });

  it('opens a dialog on the range start, then closes it from the trigger', async () => {
    const { fixture, trigger } = await setup();
    trigger.click();
    await fixture.whenStable();
    const panel: HTMLElement | null = dialog();
    expect(panel?.getAttribute('aria-modal')).toBe('true');
    expect(panel?.getAttribute('aria-label')).toBe('Choisir des dates');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(panel?.id);
    expect(document.activeElement?.getAttribute('data-date')).toBe('2026-11-02');
    expect(selected()).toEqual(['2026-11-02', '2026-11-03', '2026-11-04']);
    expect(status()).toBe('Choisissez la date de début');
    expect(panel?.getAttribute('aria-describedby')).toBe(
      panel?.querySelector('p[aria-live="polite"]')?.id,
    );

    trigger.click();
    await fixture.whenStable();
    expect(dialog()).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('keeps the value on the first pick and commits the range on the second', async () => {
    const { fixture, trigger, host, pick } = await setup();
    trigger.click();
    await fixture.whenStable();
    await pick('2026-11-12');
    expect(keys(host.value())).toEqual(['2026-11-02', '2026-11-04']);
    expect(dialog()).not.toBeNull();
    expect(selected()).toEqual(['2026-11-12']);
    expect(status()).toBe('Choisissez la date de fin');
    expect(host.touched).toBe(false);

    await pick('2026-11-18');
    expect(keys(host.value())).toEqual(['2026-11-12', '2026-11-18']);
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(host.touched).toBe(true);
    expect(trigger.textContent?.trim()).toBe('12–18 novembre 2026');
  });

  it('takes a second day before the pending start as the new start', async () => {
    const { fixture, trigger, host, pick } = await setup();
    trigger.click();
    await fixture.whenStable();
    await pick('2026-11-18');
    await pick('2026-11-12');
    expect(dialog()).not.toBeNull();
    expect(selected()).toEqual(['2026-11-12']);
    expect(status()).toBe('Choisissez la date de fin');
    expect(keys(host.value())).toEqual(['2026-11-02', '2026-11-04']);
    await pick('2026-11-15');
    expect(keys(host.value())).toEqual(['2026-11-12', '2026-11-15']);
    expect(dialog()).toBeNull();
  });

  it('commits a one-day range when the same day is picked twice', async () => {
    const { fixture, trigger, host, pick } = await setup();
    trigger.click();
    await fixture.whenStable();
    await pick('2026-11-12');
    await pick('2026-11-12');
    expect(keys(host.value())).toEqual(['2026-11-12', '2026-11-12']);
    expect(dialog()).toBeNull();
    expect(trigger.textContent?.trim()).toBe('12 novembre 2026');
  });

  it('discards the pending start on Escape and gives the focus back', async () => {
    const { fixture, trigger, host, pick } = await setup();
    trigger.click();
    await fixture.whenStable();
    await pick('2026-11-12');
    escape();
    await fixture.whenStable();
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(keys(host.value())).toEqual(['2026-11-02', '2026-11-04']);
    expect(host.touched).toBe(true);

    trigger.click();
    await fixture.whenStable();
    expect(status()).toBe('Choisissez la date de début');
    expect(selected()).toEqual(['2026-11-02', '2026-11-03', '2026-11-04']);
  });

  it('binds a required Signal Forms field, invalid once the trigger is left', async () => {
    const { fixture, trigger } = await render(FormHostComponent);
    const host: FormHostComponent = fixture.componentInstance;
    expect(trigger.getAttribute('aria-required')).toBe('true');
    expect(host.booking.stay().invalid()).toBe(true);
    expect(trigger.hasAttribute('aria-invalid')).toBe(false);

    trigger.focus();
    (fixture.nativeElement.querySelector('#after') as HTMLButtonElement).focus();
    await fixture.whenStable();
    expect(host.booking.stay().touched()).toBe(true);
    expect(trigger.getAttribute('aria-invalid')).toBe('true');

    trigger.click();
    await fixture.whenStable();
    day('2026-11-05').click();
    await fixture.whenStable();
    day('2026-11-09').click();
    await fixture.whenStable();
    expect(keys(host.model().stay)).toEqual(['2026-11-05', '2026-11-09']);
    expect(trigger.hasAttribute('aria-invalid')).toBe(false);
  });

  it('shows the error of the enclosing field on the trigger', async () => {
    const { fixture, trigger } = await render(FieldHostComponent);
    expect(trigger.hasAttribute('aria-invalid')).toBe(false);
    fixture.componentInstance.error.set('Choisissez vos dates.');
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
  });
});
