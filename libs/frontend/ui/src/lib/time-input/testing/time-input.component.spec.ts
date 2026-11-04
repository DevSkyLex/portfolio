import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormField, form, required, type FieldTree } from '@angular/forms/signals';
import { By } from '@angular/platform-browser';
import { FieldComponent } from '@internal/ui/lib/field/field.component';
import { TimeInputComponent } from '@internal/ui/lib/time-input/time-input.component';

/**
 * Component ModelHostComponent
 * @class ModelHostComponent
 *
 * @description
 * Binds the time input with two-way binding beside a label and a later focus target.
 */
@Component({
  imports: [TimeInputComponent],
  template: `
    <label for="start">Début</label>
    <ui-time-input
      inputId="start"
      [class]="extra()"
      [size]="size()"
      [minuteStep]="step()"
      [readonly]="locked()"
      [disabled]="off()"
      [(value)]="value"
      (touch)="touches = touches + 1"
    />
    <button type="button" id="after">Après</button>
  `,
})
class ModelHostComponent {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Bound time.
   *
   * @type {WritableSignal<string>}
   */
  public readonly value: WritableSignal<string> = signal<string>('');

  /**
   * Property step
   * @readonly
   *
   * @description
   * Minute step of the arrows.
   *
   * @type {WritableSignal<number>}
   */
  public readonly step: WritableSignal<number> = signal<number>(1);

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
   * Property size
   * @readonly
   *
   * @description
   * Box size.
   *
   * @type {WritableSignal<'sm' | 'md' | 'lg'>}
   */
  public readonly size: WritableSignal<'sm' | 'md' | 'lg'> = signal<'sm' | 'md' | 'lg'>('md');

  /**
   * Property extra
   * @readonly
   *
   * @description
   * Caller classes.
   *
   * @type {WritableSignal<string>}
   */
  public readonly extra: WritableSignal<string> = signal<string>('');

  /**
   * Property touches
   *
   * @description
   * Number of touch notifications.
   *
   * @type {number}
   */
  public touches: number = 0;
  // #endregion
}

/**
 * Interface TimeModel
 *
 * @description
 * Form model of the form host.
 */
interface TimeModel {
  start: string;
}

/**
 * Component FormHostComponent
 * @class FormHostComponent
 *
 * @description
 * Binds a required time to a Signal Form inside a `ui-field`.
 */
@Component({
  imports: [TimeInputComponent, FieldComponent, FormField],
  template: `
    <ui-field label="Heure de début" controlId="begin" [error]="error()">
      <ui-time-input inputId="begin" ariaDescribedby="begin-hint" [formField]="time.start" />
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
   * @type {WritableSignal<TimeModel>}
   */
  public readonly model: WritableSignal<TimeModel> = signal<TimeModel>({ start: '' });

  /**
   * Property time
   * @readonly
   *
   * @description
   * Form tree: the start time is required.
   *
   * @type {FieldTree<TimeModel, string | number, 'writable'>}
   */
  public readonly time: FieldTree<TimeModel, string | number, 'writable'> = form(
    this.model,
    (path) => {
      required(path.start);
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
 * Function setupModel
 *
 * @description
 * Renders the two-way host with an initial value.
 *
 * @param {string} value - Initial time.
 * @returns {Promise<{ fixture: ComponentFixture<ModelHostComponent>; group: HTMLElement; hours: HTMLInputElement; minutes: HTMLInputElement }>} Fixture, group and segments.
 */
async function setupModel(value: string = ''): Promise<{
  fixture: ComponentFixture<ModelHostComponent>;
  group: HTMLElement;
  hours: HTMLInputElement;
  minutes: HTMLInputElement;
}> {
  const fixture: ComponentFixture<ModelHostComponent> = TestBed.createComponent(ModelHostComponent);
  fixture.componentInstance.value.set(value);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const group: HTMLElement = fixture.nativeElement.querySelector('ui-time-input') as HTMLElement;
  return {
    fixture,
    group,
    hours: group.querySelector('[data-slot="time-input-hours"]') as HTMLInputElement,
    minutes: group.querySelector('[data-slot="time-input-minutes"]') as HTMLInputElement,
  };
}

/**
 * Function setupForm
 *
 * @description
 * Renders the Signal Forms host.
 *
 * @returns {Promise<{ fixture: ComponentFixture<FormHostComponent>; group: HTMLElement; hours: HTMLInputElement; minutes: HTMLInputElement }>} Fixture, group and segments.
 */
async function setupForm(): Promise<{
  fixture: ComponentFixture<FormHostComponent>;
  group: HTMLElement;
  hours: HTMLInputElement;
  minutes: HTMLInputElement;
}> {
  const fixture: ComponentFixture<FormHostComponent> = TestBed.createComponent(FormHostComponent);
  fixture.autoDetectChanges();
  await fixture.whenStable();
  const group: HTMLElement = fixture.nativeElement.querySelector('ui-time-input') as HTMLElement;
  return {
    fixture,
    group,
    hours: group.querySelector('[data-slot="time-input-hours"]') as HTMLInputElement,
    minutes: group.querySelector('[data-slot="time-input-minutes"]') as HTMLInputElement,
  };
}

/**
 * Function press
 *
 * @description
 * Dispatches a cancelable keydown on a segment and waits for the view.
 *
 * @param {ComponentFixture<unknown>} fixture - Fixture to stabilise.
 * @param {HTMLElement} target - Segment receiving the key.
 * @param {string} key - Key value.
 * @param {KeyboardEventInit} [init] - Extra event fields (modifiers).
 * @returns {Promise<KeyboardEvent>} The dispatched event.
 */
async function press(
  fixture: ComponentFixture<unknown>,
  target: HTMLElement,
  key: string,
  init: KeyboardEventInit = {},
): Promise<KeyboardEvent> {
  const event: KeyboardEvent = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  await fixture.whenStable();
  return event;
}

/**
 * Function typeKeys
 *
 * @description
 * Presses each character on the focused element, as a user typing.
 *
 * @param {ComponentFixture<unknown>} fixture - Fixture to stabilise.
 * @param {string} keys - Characters to press.
 * @returns {Promise<void>}
 */
async function typeKeys(fixture: ComponentFixture<unknown>, keys: string): Promise<void> {
  for (const key of keys) await press(fixture, document.activeElement as HTMLElement, key);
}

describe('TimeInputComponent', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders a labelled group of two empty spinbuttons', async () => {
    const { group, hours, minutes } = await setupModel();
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Heure');
    expect(group.hasAttribute('aria-required')).toBe(false);
    expect(group.hasAttribute('aria-invalid')).toBe(false);
    expect(group.className).toContain('h-11');
    for (const segment of [hours, minutes]) {
      expect(segment.getAttribute('role')).toBe('spinbutton');
      expect(segment.getAttribute('inputmode')).toBe('numeric');
      expect(segment.placeholder).toBe('--');
      expect(segment.value).toBe('');
      expect(segment.getAttribute('aria-valuemin')).toBe('0');
      expect(segment.getAttribute('aria-valuetext')).toBe('Vide');
      expect(segment.hasAttribute('aria-valuenow')).toBe(false);
      expect(segment.className).toContain('placeholder:text-fg-faint');
    }
    expect(hours.id).toBe('start');
    expect(hours.getAttribute('aria-label')).toBe('Heures');
    expect(hours.getAttribute('aria-valuemax')).toBe('23');
    expect(minutes.id).toBe('start-minutes');
    expect(minutes.getAttribute('aria-label')).toBe('Minutes');
    expect(minutes.getAttribute('aria-valuemax')).toBe('59');
    const separator: HTMLElement | null = group.querySelector('span[aria-hidden="true"]');
    expect(separator?.textContent).toBe(':');
  });

  it('labels the hours from a label pointing at the input id, and focuses them through focus()', async () => {
    const { fixture, hours } = await setupModel();
    const label: HTMLLabelElement = fixture.nativeElement.querySelector('label');
    // The labelled control is what a browser focuses on a label click (jsdom does not focus it).
    expect(label.control).toBe(hours);
    expect(document.activeElement).not.toBe(hours);
    const control: TimeInputComponent = fixture.debugElement.query(By.directive(TimeInputComponent))
      .componentInstance as TimeInputComponent;
    control.focus();
    expect(document.activeElement).toBe(hours);
  });

  it('shows a bound value and drops a value that is not HH:mm', async () => {
    const { fixture, hours, minutes } = await setupModel('07:05');
    expect(hours.value).toBe('07');
    expect(minutes.value).toBe('05');
    expect(hours.getAttribute('aria-valuenow')).toBe('7');
    expect(hours.getAttribute('aria-valuetext')).toBe('07');
    expect(minutes.getAttribute('aria-valuenow')).toBe('5');
    fixture.componentInstance.value.set('25:00');
    await fixture.whenStable();
    expect(hours.value).toBe('');
    expect(minutes.value).toBe('');
  });

  it('steps with the arrows and wraps at both ends', async () => {
    const { fixture, hours, minutes } = await setupModel();
    const up: KeyboardEvent = await press(fixture, hours, 'ArrowUp');
    expect(up.defaultPrevented).toBe(true);
    expect(hours.value).toBe('00');
    expect(fixture.componentInstance.value()).toBe('');
    await press(fixture, hours, 'ArrowDown');
    expect(hours.value).toBe('23');
    await press(fixture, hours, 'ArrowUp');
    expect(hours.value).toBe('00');
    await press(fixture, minutes, 'ArrowDown');
    expect(minutes.value).toBe('59');
    expect(fixture.componentInstance.value()).toBe('00:59');
    await press(fixture, minutes, 'ArrowUp');
    expect(minutes.value).toBe('00');
    expect(fixture.componentInstance.value()).toBe('00:00');
  });

  it('steps the minutes by minuteStep, snapping a typed value to the step', async () => {
    const { fixture, minutes } = await setupModel('10:07');
    fixture.componentInstance.step.set(15);
    await fixture.whenStable();
    await press(fixture, minutes, 'ArrowUp');
    expect(fixture.componentInstance.value()).toBe('10:15');
    fixture.componentInstance.value.set('10:07');
    await fixture.whenStable();
    await press(fixture, minutes, 'ArrowDown');
    expect(fixture.componentInstance.value()).toBe('10:00');
    await press(fixture, minutes, 'ArrowDown');
    expect(fixture.componentInstance.value()).toBe('10:45');
    await press(fixture, minutes, 'ArrowUp');
    expect(fixture.componentInstance.value()).toBe('10:00');
    await press(fixture, minutes, 'End');
    expect(fixture.componentInstance.value()).toBe('10:45');
    await press(fixture, minutes, 'PageUp');
    expect(fixture.componentInstance.value()).toBe('10:00');
  });

  it('falls back to a one-minute step for an invalid minuteStep', async () => {
    const { fixture, minutes } = await setupModel('10:00');
    fixture.componentInstance.step.set(0);
    await fixture.whenStable();
    await press(fixture, minutes, 'ArrowUp');
    expect(fixture.componentInstance.value()).toBe('10:01');
  });

  it('jumps 4 hours and 10 minutes with PageUp and PageDown, wrapping', async () => {
    const { fixture, hours, minutes } = await setupModel('22:55');
    await press(fixture, hours, 'PageUp');
    expect(fixture.componentInstance.value()).toBe('02:55');
    await press(fixture, hours, 'PageDown');
    expect(fixture.componentInstance.value()).toBe('22:55');
    await press(fixture, minutes, 'PageUp');
    expect(fixture.componentInstance.value()).toBe('22:05');
    await press(fixture, minutes, 'PageDown');
    expect(fixture.componentInstance.value()).toBe('22:55');
  });

  it('goes to the first and last values with Home and End', async () => {
    const { fixture, hours, minutes } = await setupModel('12:30');
    await press(fixture, hours, 'End');
    expect(fixture.componentInstance.value()).toBe('23:30');
    await press(fixture, hours, 'Home');
    expect(fixture.componentInstance.value()).toBe('00:30');
    await press(fixture, minutes, 'End');
    expect(fixture.componentInstance.value()).toBe('00:59');
    await press(fixture, minutes, 'Home');
    expect(fixture.componentInstance.value()).toBe('00:00');
  });

  it('types the hours, moves on once they are unambiguous, then types the minutes', async () => {
    const { fixture, hours, minutes } = await setupModel();
    hours.focus();
    const digit: KeyboardEvent = await press(fixture, hours, '1');
    expect(digit.defaultPrevented).toBe(true);
    expect(hours.value).toBe('01');
    expect(document.activeElement).toBe(hours);
    expect(fixture.componentInstance.value()).toBe('');
    await typeKeys(fixture, '4');
    expect(hours.value).toBe('14');
    expect(document.activeElement).toBe(minutes);
    expect(fixture.componentInstance.value()).toBe('');
    await typeKeys(fixture, '3');
    expect(minutes.value).toBe('03');
    expect(fixture.componentInstance.value()).toBe('14:03');
    await typeKeys(fixture, '0');
    expect(fixture.componentInstance.value()).toBe('14:30');
    await typeKeys(fixture, '7');
    expect(fixture.componentInstance.value()).toBe('14:07');

    hours.focus();
    await typeKeys(fixture, '3');
    expect(hours.value).toBe('03');
    expect(document.activeElement).toBe(minutes);
    hours.focus();
    await typeKeys(fixture, '25');
    expect(hours.value).toBe('05');
    expect(document.activeElement).toBe(minutes);
    expect(fixture.componentInstance.value()).toBe('05:07');
  });

  it('forgets a first digit when the focus moves or another key is pressed', async () => {
    const { fixture, hours, minutes } = await setupModel('10:00');
    hours.focus();
    await typeKeys(fixture, '1');
    minutes.focus();
    hours.focus();
    await typeKeys(fixture, '2');
    expect(hours.value).toBe('02');
    expect(document.activeElement).toBe(hours);
    await press(fixture, hours, 'ArrowUp');
    await typeKeys(fixture, '0');
    expect(hours.value).toBe('00');
    expect(document.activeElement).toBe(hours);
  });

  it('keeps an incomplete entry while emitting an empty value', async () => {
    const { fixture, hours, minutes } = await setupModel('14:30');
    await press(fixture, minutes, 'Backspace');
    expect(fixture.componentInstance.value()).toBe('');
    expect(hours.value).toBe('14');
    expect(minutes.value).toBe('');
    expect(minutes.getAttribute('aria-valuetext')).toBe('Vide');
    await press(fixture, minutes, 'ArrowUp');
    expect(fixture.componentInstance.value()).toBe('14:00');
    await press(fixture, hours, 'Delete');
    expect(fixture.componentInstance.value()).toBe('');
    expect(hours.value).toBe('');
    fixture.componentInstance.value.set('08:15');
    await fixture.whenStable();
    expect(hours.value).toBe('08');
    expect(minutes.value).toBe('15');
    fixture.componentInstance.value.set('');
    await fixture.whenStable();
    expect(hours.value).toBe('');
    expect(minutes.value).toBe('');
  });

  it('moves between the segments with ArrowLeft, ArrowRight and the separator key', async () => {
    const { fixture, hours, minutes } = await setupModel();
    hours.focus();
    const right: KeyboardEvent = await press(fixture, hours, 'ArrowRight');
    expect(right.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(minutes);
    await press(fixture, minutes, 'ArrowLeft');
    expect(document.activeElement).toBe(hours);
    await press(fixture, hours, ':');
    expect(document.activeElement).toBe(minutes);
    await press(fixture, minutes, ':');
    expect(document.activeElement).toBe(minutes);
  });

  it('leaves modified keys, Tab and Enter to the browser', async () => {
    const { fixture, hours } = await setupModel('10:00');
    for (const event of [
      await press(fixture, hours, 'ArrowUp', { ctrlKey: true }),
      await press(fixture, hours, 'Tab'),
      await press(fixture, hours, 'Enter'),
      await press(fixture, hours, 'a'),
    ]) {
      expect(event.defaultPrevented).toBe(false);
    }
    expect(fixture.componentInstance.value()).toBe('10:00');
  });

  it('applies the digits and deletions of a virtual keyboard and refuses other edits', async () => {
    const { fixture, hours, minutes } = await setupModel();
    hours.focus();
    const insert: InputEvent = new InputEvent('beforeinput', {
      inputType: 'insertText',
      data: '09h3',
      bubbles: true,
      cancelable: true,
    });
    hours.dispatchEvent(insert);
    await fixture.whenStable();
    expect(insert.defaultPrevented).toBe(true);
    expect(hours.value).toBe('09');
    expect(minutes.value).toBe('03');
    expect(fixture.componentInstance.value()).toBe('09:03');
    minutes.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'deleteContentBackward',
        bubbles: true,
        cancelable: true,
      }),
    );
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe('');
    const drop: InputEvent = new InputEvent('beforeinput', {
      inputType: 'insertFromDrop',
      bubbles: true,
      cancelable: true,
    });
    minutes.dispatchEvent(drop);
    expect(drop.defaultPrevented).toBe(true);
  });

  it('keeps the segments navigable but unchanged when read-only', async () => {
    const { fixture, hours, minutes } = await setupModel('10:00');
    fixture.componentInstance.locked.set(true);
    await fixture.whenStable();
    expect(hours.readOnly).toBe(true);
    hours.focus();
    for (const key of ['ArrowUp', '5', 'Backspace', ':']) await press(fixture, hours, key);
    hours.dispatchEvent(
      new InputEvent('beforeinput', {
        inputType: 'insertText',
        data: '1',
        bubbles: true,
        cancelable: true,
      }),
    );
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe('10:00');
    expect(document.activeElement).toBe(hours);
    await press(fixture, hours, 'ArrowRight');
    expect(document.activeElement).toBe(minutes);
  });

  it('disables both segments and the box', async () => {
    const { fixture, group, hours, minutes } = await setupModel('10:00');
    fixture.componentInstance.off.set(true);
    await fixture.whenStable();
    expect(hours.disabled).toBe(true);
    expect(minutes.disabled).toBe(true);
    expect(group.getAttribute('aria-disabled')).toBe('true');
    expect(group.hasAttribute('data-disabled')).toBe(true);
    const down: MouseEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    group.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(false);
  });

  it('reports the touch only when the focus leaves the whole control', async () => {
    const { fixture, hours, minutes } = await setupModel();
    hours.focus();
    minutes.focus();
    expect(fixture.componentInstance.touches).toBe(0);
    (fixture.nativeElement.querySelector('#after') as HTMLButtonElement).focus();
    expect(fixture.componentInstance.touches).toBe(1);
  });

  it('focuses the hours on a press of the box outside the segments', async () => {
    const { group, hours, minutes } = await setupModel();
    const separator: HTMLElement = group.querySelector('span') as HTMLElement;
    const down: MouseEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    separator.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(hours);
    minutes.focus();
    group.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(minutes);
    const onSegment: MouseEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    hours.dispatchEvent(onSegment);
    expect(onSegment.defaultPrevented).toBe(false);
  });

  it('applies the size and merges caller classes', async () => {
    const { fixture, group } = await setupModel();
    fixture.componentInstance.size.set('sm');
    fixture.componentInstance.extra.set('w-auto');
    await fixture.whenStable();
    expect(group.className).toContain('h-9');
    expect(group.className).toContain('w-auto');
    expect(group.className).not.toContain('w-full');
  });

  it('binds a required Signal Forms field and shows it invalid once left', async () => {
    const { fixture, group, hours, minutes } = await setupForm();
    const label: HTMLLabelElement = fixture.nativeElement.querySelector('label');
    expect(label.control).toBe(hours);
    // ARIA allows aria-required on the spinbuttons, not on their group.
    expect(group.hasAttribute('aria-required')).toBe(false);
    expect(hours.getAttribute('aria-required')).toBe('true');
    expect(minutes.getAttribute('aria-required')).toBe('true');
    expect(group.hasAttribute('aria-invalid')).toBe(false);
    expect(hours.getAttribute('aria-describedby')).toBe('begin-hint');
    expect(fixture.componentInstance.time.start().touched()).toBe(false);
    hours.focus();
    minutes.focus();
    expect(fixture.componentInstance.time.start().touched()).toBe(false);
    (fixture.nativeElement.querySelector('#after') as HTMLButtonElement).focus();
    await fixture.whenStable();
    expect(fixture.componentInstance.time.start().touched()).toBe(true);
    expect(group.getAttribute('aria-invalid')).toBe('true');
    expect(hours.getAttribute('aria-invalid')).toBe('true');
    expect(group.className).toContain('aria-invalid:not-focus-within:border-danger');

    hours.focus();
    await typeKeys(fixture, '0930');
    expect(fixture.componentInstance.model().start).toBe('09:30');
    expect(group.hasAttribute('aria-invalid')).toBe(false);
  });

  it('shows the error of the enclosing field', async () => {
    const { fixture, group } = await setupForm();
    fixture.componentInstance.error.set('Indiquez une heure.');
    await fixture.whenStable();
    expect(group.getAttribute('aria-invalid')).toBe('true');
  });
});
