import { Component, LOCALE_ID, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { DatePickerComponent } from '@internal/ui/lib/date-picker/date-picker.component';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Test host binds a date value and records whether the picker reports the control as touched.
 */
@Component({
  imports: [DatePickerComponent],
  template: `<ui-date-picker triggerId="start" [(value)]="value" (touch)="touched = true" />`,
})
class HostComponent {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Mutable date value bound bidirectionally to the picker under test.
   *
   * @type {WritableSignal<Date | null>}
   */
  public readonly value: WritableSignal<Date | null> = signal<Date | null>(null);

  /**
   * Property touched
   *
   * @description
   * Records the picker's touch notification from its host event binding.
   *
   * @type {boolean}
   */
  public touched: boolean = false;
  // #endregion
}

/**
 * Function setup
 *
 * @description
 * Configures French date formatting, creates a stable fixture and returns the trigger, overlay reader
 * and host state for interaction assertions.
 *
 * @param {Date | null} value - Initial date shown by the picker, or null for its placeholder.
 * @returns {Promise<{ fixture: ComponentFixture<HostComponent>; trigger: HTMLButtonElement; dialog: () => HTMLElement | null; host: HostComponent }>} Fixture handles for the picker dialog and bound value.
 */
async function setup(value: Date | null = null): Promise<{
  fixture: ComponentFixture<HostComponent>;
  trigger: HTMLButtonElement;
  dialog: () => HTMLElement | null;
  host: HostComponent;
}> {
  TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'fr-FR' }] });
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  fixture.componentInstance.value.set(value);
  await fixture.whenStable();
  const trigger: HTMLButtonElement = fixture.nativeElement.querySelector(
    '#start',
  ) as HTMLButtonElement;
  const dialog = (): HTMLElement | null =>
    document.querySelector<HTMLElement>('.cdk-overlay-container [role="dialog"]');
  return { fixture, trigger, dialog, host: fixture.componentInstance };
}

describe('DatePickerComponent', () => {
  it('shows the placeholder, then the formatted value', async () => {
    const { fixture, trigger, host } = await setup();
    expect(trigger.textContent?.trim()).toBe('Choisir une date');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    host.value.set(new Date(2026, 10, 2));
    await fixture.whenStable();
    expect(trigger.textContent?.trim()).toBe('2 novembre 2026');
  });

  it('opens the calendar on the selected day and picks a date', async () => {
    const { fixture, trigger, dialog, host } = await setup(new Date(2026, 10, 2));
    trigger.click();
    await fixture.whenStable();
    const panel: HTMLElement | null = dialog();
    expect(panel?.getAttribute('aria-modal')).toBe('true');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(panel?.id);
    expect(document.activeElement?.getAttribute('data-date')).toBe('2026-11-02');

    panel?.querySelector<HTMLButtonElement>('[data-date="2026-11-12"]')?.click();
    await fixture.whenStable();
    expect(host.value()?.getDate()).toBe(12);
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(host.touched).toBe(true);
  });

  it('closes on Escape and gives the focus back to the trigger', async () => {
    const { fixture, trigger, dialog } = await setup();
    trigger.click();
    await fixture.whenStable();
    expect(dialog()).not.toBeNull();
    (document.activeElement as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();
    expect(dialog()).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });
});
