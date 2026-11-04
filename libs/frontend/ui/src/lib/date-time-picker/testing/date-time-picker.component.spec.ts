import { Component, LOCALE_ID, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormField, form, required, type FieldTree } from '@angular/forms/signals';
import { DateTimePickerComponent } from '@internal/ui/lib/date-time-picker/date-time-picker.component';
import { FieldComponent } from '@internal/ui/lib/field/field.component';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Binds a date-time value with two-way binding and records the touch notification.
 */
@Component({
  imports: [DateTimePickerComponent],
  template: `
    <ui-date-time-picker
      triggerId="meeting"
      [defaultTime]="defaultTime()"
      [minuteStep]="step()"
      [minDate]="minDate()"
      [readonly]="locked()"
      [disabled]="off()"
      [(value)]="value"
      (touch)="touched = true"
    />
    <button type="button" id="after">Après</button>
  `,
})
class HostComponent {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Bound date and time.
   *
   * @type {WritableSignal<Date | null>}
   */
  public readonly value: WritableSignal<Date | null> = signal<Date | null>(null);

  /**
   * Property defaultTime
   * @readonly
   *
   * @description
   * Time given to a day picked before any time.
   *
   * @type {WritableSignal<string>}
   */
  public readonly defaultTime: WritableSignal<string> = signal<string>('09:00');

  /**
   * Property step
   * @readonly
   *
   * @description
   * Minute step of the time input.
   *
   * @type {WritableSignal<number>}
   */
  public readonly step: WritableSignal<number> = signal<number>(1);

  /**
   * Property minDate
   * @readonly
   *
   * @description
   * Earliest selectable day.
   *
   * @type {WritableSignal<Date | undefined>}
   */
  public readonly minDate: WritableSignal<Date | undefined> = signal<Date | undefined>(undefined);

  /**
   * Property locked
   * @readonly
   *
   * @description
   * Read-only state.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly locked: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Property off
   * @readonly
   *
   * @description
   * Disabled state.
   *
   * @type {WritableSignal<boolean>}
   */
  public readonly off: WritableSignal<boolean> = signal<boolean>(false);

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
 * Interface MeetingModel
 *
 * @description
 * Form model of the form host.
 */
interface MeetingModel {
  meeting: Date | null;
}

/**
 * Component FormHostComponent
 * @class FormHostComponent
 *
 * @description
 * Binds a required date-time to a Signal Form inside a `ui-field`.
 */
@Component({
  imports: [DateTimePickerComponent, FieldComponent, FormField],
  template: `
    <ui-field label="Rendez-vous" controlId="meeting" [error]="error()">
      <ui-date-time-picker triggerId="meeting" [formField]="meeting.meeting" />
    </ui-field>
    <button type="button" id="after">Après</button>
  `,
})
class FormHostComponent {
  // #region Properties
  /**
   * Property model
   * @readonly
   *
   * @description
   * Source model of the form.
   *
   * @type {WritableSignal<MeetingModel>}
   */
  public readonly model: WritableSignal<MeetingModel> = signal<MeetingModel>({ meeting: null });

  /**
   * Property meeting
   * @readonly
   *
   * @description
   * Form tree: the meeting is required.
   *
   * @type {FieldTree<MeetingModel, string | number, 'writable'>}
   */
  public readonly meeting: FieldTree<MeetingModel, string | number, 'writable'> = form(
    this.model,
    (path) => {
      required(path.meeting);
    },
  );

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
 * Function setup
 *
 * @description
 * Configures French formatting and renders the two-way host with an initial value.
 *
 * @param {Date | null} value - Initial value.
 * @returns {Promise<{ fixture: ComponentFixture<HostComponent>; trigger: HTMLButtonElement; host: HostComponent }>} Fixture, trigger and host.
 */
async function setup(value: Date | null = null): Promise<{
  fixture: ComponentFixture<HostComponent>;
  trigger: HTMLButtonElement;
  host: HostComponent;
}> {
  TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'fr-FR' }] });
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  fixture.componentInstance.value.set(value);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const trigger: HTMLButtonElement = fixture.nativeElement.querySelector(
    '#meeting',
  ) as HTMLButtonElement;
  return { fixture, trigger, host: fixture.componentInstance };
}

/**
 * Function dialog
 *
 * @description
 * Open dialog of the picker, if any.
 *
 * @returns {HTMLElement | null} The dialog element.
 */
function dialog(): HTMLElement | null {
  return document.querySelector<HTMLElement>('.cdk-overlay-container [role="dialog"]');
}

/**
 * Function segment
 *
 * @description
 * Segment of the time input in the open dialog.
 *
 * @param {'hours' | 'minutes'} name - Segment to find.
 * @returns {HTMLInputElement} The segment.
 */
function segment(name: 'hours' | 'minutes'): HTMLInputElement {
  return dialog()?.querySelector(`[data-slot="time-input-${name}"]`) as HTMLInputElement;
}

/**
 * Function press
 *
 * @description
 * Dispatches a cancelable keydown and waits for the view.
 *
 * @param {ComponentFixture<unknown>} fixture - Fixture to stabilise.
 * @param {HTMLElement} target - Element receiving the key.
 * @param {string} key - Key value.
 * @returns {Promise<void>}
 */
async function press(
  fixture: ComponentFixture<unknown>,
  target: HTMLElement,
  key: string,
): Promise<void> {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  await fixture.whenStable();
}

/**
 * Function pick
 *
 * @description
 * Clicks a day of the open calendar.
 *
 * @param {ComponentFixture<unknown>} fixture - Fixture to stabilise.
 * @param {string} key - Day key, `YYYY-MM-DD`.
 * @returns {Promise<void>}
 */
async function pick(fixture: ComponentFixture<unknown>, key: string): Promise<void> {
  dialog()?.querySelector<HTMLButtonElement>(`[data-date="${key}"]`)?.click();
  await fixture.whenStable();
}

/**
 * Function dayOfThisMonth
 *
 * @description
 * Key of a day in the current local month, the month a calendar without a value shows.
 *
 * @param {number} day - Day of the month.
 * @returns {string} The `YYYY-MM-DD` key.
 */
function dayOfThisMonth(day: number): string {
  const today: Date = new Date();
  const month: string = String(today.getMonth() + 1).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${String(day).padStart(2, '0')}`;
}

describe('DateTimePickerComponent', () => {
  it('shows the placeholder, then the formatted date and time', async () => {
    const { fixture, trigger, host } = await setup();
    expect(trigger.textContent?.trim()).toBe('Choisir une date et une heure');
    expect(trigger.className).toContain('text-fg-faint');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    host.value.set(new Date(2026, 10, 2, 14, 30));
    await fixture.whenStable();
    expect(trigger.textContent?.trim()).toBe('2 novembre 2026 à 14:30');
  });

  it('opens the calendar and the time bar, focused on the selected day', async () => {
    const { fixture, trigger } = await setup(new Date(2026, 10, 2, 14, 30));
    trigger.click();
    await fixture.whenStable();
    const panel: HTMLElement | null = dialog();
    expect(panel?.getAttribute('aria-modal')).toBe('true');
    expect(panel?.getAttribute('aria-label')).toBe('Choisir une date et une heure');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(panel?.id);
    expect(document.activeElement?.getAttribute('data-date')).toBe('2026-11-02');

    const group: HTMLElement | null | undefined = panel?.querySelector('ui-time-input');
    const label: HTMLLabelElement | null | undefined = panel?.querySelector('label');
    expect(label?.textContent?.trim()).toBe('Heure');
    expect(group?.getAttribute('aria-labelledby')).toBe(label?.id);
    expect(group?.hasAttribute('aria-label')).toBe(false);
    expect(label?.control).toBe(segment('hours'));
    expect(segment('hours').value).toBe('14');
    expect(segment('minutes').value).toBe('30');
    expect(group?.className).toContain('h-9');
    const confirm: HTMLButtonElement | null | undefined = panel?.querySelector(
      '[data-slot="date-time-picker-time"] button',
    );
    expect(confirm?.textContent?.trim()).toBe('Valider');
  });

  it('picks a day at the time shown and stays open', async () => {
    const { fixture, trigger, host } = await setup(new Date(2026, 10, 2, 14, 30));
    trigger.click();
    await fixture.whenStable();
    await pick(fixture, '2026-11-12');
    expect(host.value()).toEqual(new Date(2026, 10, 12, 14, 30));
    expect(dialog()).not.toBeNull();
    expect(host.touched).toBe(false);
  });

  it('gives a day picked before any time the default time', async () => {
    const { fixture, trigger, host } = await setup();
    trigger.click();
    await fixture.whenStable();
    expect(segment('hours').value).toBe('');
    await pick(fixture, dayOfThisMonth(15));
    expect(host.value()?.getHours()).toBe(9);
    expect(host.value()?.getMinutes()).toBe(0);
    expect(segment('hours').value).toBe('09');
    expect(segment('minutes').value).toBe('00');

    host.value.set(null);
    host.defaultTime.set('18:45');
    await fixture.whenStable();
    await pick(fixture, dayOfThisMonth(16));
    expect(host.value()?.getHours()).toBe(18);
    expect(host.value()?.getMinutes()).toBe(45);
  });

  it('gives midnight when the default time is invalid', async () => {
    const { fixture, trigger, host } = await setup(new Date(2026, 10, 2, 14, 30));
    host.defaultTime.set('9h');
    trigger.click();
    await fixture.whenStable();
    await press(fixture, segment('hours'), 'Backspace');
    await pick(fixture, '2026-11-04');
    expect(host.value()).toEqual(new Date(2026, 10, 4, 0, 0));
  });

  it('applies an edited time to the day set', async () => {
    const { fixture, trigger, host } = await setup(new Date(2026, 10, 2, 14, 30));
    host.step.set(15);
    trigger.click();
    await fixture.whenStable();
    await press(fixture, segment('hours'), 'ArrowUp');
    expect(host.value()).toEqual(new Date(2026, 10, 2, 15, 30));
    await press(fixture, segment('minutes'), 'ArrowUp');
    expect(host.value()).toEqual(new Date(2026, 10, 2, 15, 45));
    expect(trigger.textContent?.trim()).toBe('2 novembre 2026 à 15:45');
    await press(fixture, segment('minutes'), 'Delete');
    expect(host.value()).toEqual(new Date(2026, 10, 2, 15, 45));
    expect(segment('minutes').value).toBe('');
  });

  it('keeps a time set before the day, and falls back to the default for an incomplete one', async () => {
    const { fixture, trigger, host } = await setup();
    trigger.click();
    await fixture.whenStable();
    const day: string = dayOfThisMonth(10);
    segment('hours').focus();
    for (const key of '1645') await press(fixture, document.activeElement as HTMLElement, key);
    expect(host.value()).toBeNull();
    await pick(fixture, day);
    expect(host.value()?.getHours()).toBe(16);
    expect(host.value()?.getMinutes()).toBe(45);

    host.value.set(null);
    await fixture.whenStable();
    segment('hours').focus();
    await press(fixture, segment('hours'), '1');
    await pick(fixture, day);
    expect(host.value()?.getHours()).toBe(9);
    expect(segment('hours').value).toBe('09');
  });

  it('closes with Valider and gives the focus back to the trigger', async () => {
    const { fixture, trigger, host } = await setup(new Date(2026, 10, 2, 14, 30));
    trigger.click();
    await fixture.whenStable();
    dialog()
      ?.querySelector<HTMLButtonElement>('[data-slot="date-time-picker-time"] button')
      ?.click();
    await fixture.whenStable();
    expect(dialog()).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
    expect(host.touched).toBe(true);
    expect(host.value()).toEqual(new Date(2026, 10, 2, 14, 30));
  });

  it('closes on Escape from the time input and gives the focus back', async () => {
    const { fixture, trigger } = await setup();
    trigger.click();
    await fixture.whenStable();
    segment('hours').focus();
    segment('hours').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on an outside click without taking the focus back', async () => {
    const { fixture, trigger, host } = await setup();
    trigger.click();
    await fixture.whenStable();
    const after: HTMLButtonElement = fixture.nativeElement.querySelector('#after');
    after.focus();
    after.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    after.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await fixture.whenStable();
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(after);
    expect(host.touched).toBe(true);
  });

  it('toggles closed from the trigger and marks the control touched on blur', async () => {
    const { fixture, trigger, host } = await setup();
    trigger.click();
    await fixture.whenStable();
    expect(host.touched).toBe(false);
    trigger.click();
    await fixture.whenStable();
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(trigger);
    host.touched = false;
    trigger.blur();
    expect(host.touched).toBe(true);
  });

  it('bounds the days with minDate', async () => {
    const { fixture, trigger, host } = await setup(new Date(2026, 10, 12, 8, 0));
    host.minDate.set(new Date(2026, 10, 10));
    trigger.click();
    await fixture.whenStable();
    expect(dialog()?.querySelector('[data-date="2026-11-09"]')?.getAttribute('aria-disabled')).toBe(
      'true',
    );
    await pick(fixture, '2026-11-09');
    expect(host.value()).toEqual(new Date(2026, 10, 12, 8, 0));
  });

  it('does not open when read-only or disabled', async () => {
    const { fixture, trigger, host } = await setup();
    host.locked.set(true);
    await fixture.whenStable();
    trigger.click();
    await fixture.whenStable();
    expect(dialog()).toBeNull();
    expect(trigger.getAttribute('aria-readonly')).toBe('true');
    host.locked.set(false);
    host.off.set(true);
    await fixture.whenStable();
    expect(trigger.disabled).toBe(true);
  });

  it('binds a required Signal Forms field and shows it invalid once left', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'fr-FR' }] });
    const fixture: ComponentFixture<FormHostComponent> = TestBed.createComponent(FormHostComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('#meeting');
    const label: HTMLLabelElement = fixture.nativeElement.querySelector('label');
    expect(label.control).toBe(trigger);
    expect(trigger.getAttribute('aria-required')).toBe('true');
    expect(trigger.hasAttribute('aria-invalid')).toBe(false);
    trigger.focus();
    trigger.blur();
    await fixture.whenStable();
    expect(fixture.componentInstance.meeting.meeting().touched()).toBe(true);
    expect(trigger.getAttribute('aria-invalid')).toBe('true');

    trigger.click();
    await fixture.whenStable();
    await pick(fixture, dayOfThisMonth(new Date().getDate()));
    expect(fixture.componentInstance.model().meeting?.getHours()).toBe(9);
    expect(trigger.hasAttribute('aria-invalid')).toBe(false);
  });

  it('shows the field error on the trigger only, not on the time input', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'fr-FR' }] });
    const fixture: ComponentFixture<FormHostComponent> = TestBed.createComponent(FormHostComponent);
    fixture.autoDetectChanges();
    fixture.componentInstance.error.set('Choisissez un rendez-vous.');
    await fixture.whenStable();
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('#meeting');
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
    trigger.click();
    await fixture.whenStable();
    expect(dialog()?.querySelector('ui-time-input')?.hasAttribute('aria-invalid')).toBe(false);
  });
});
