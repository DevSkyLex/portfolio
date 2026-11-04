import { Component, LOCALE_ID, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormField, form, required, type FieldTree } from '@angular/forms/signals';
import { MonthPickerComponent } from '@internal/ui/lib/month-picker/month-picker.component';
import type { YearMonth } from '@internal/ui/lib/month-picker/models/year-month/year-month.interface';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Binds a month with two-way binding and records the touch notification.
 */
@Component({
  imports: [MonthPickerComponent],
  template: `<ui-month-picker
    triggerId="start"
    [minMonth]="{ year: 2026, month: 2 }"
    [(value)]="value"
    (touch)="touched = true"
  />`,
})
class HostComponent {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Bound month.
   *
   * @type {WritableSignal<YearMonth | null>}
   */
  public readonly value: WritableSignal<YearMonth | null> = signal<YearMonth | null>(null);

  /**
   * Property touched
   *
   * @description
   * Whether the picker reported a touch.
   *
   * @type {boolean}
   */
  public touched: boolean = false;
  // #endregion
}

/**
 * Class FormHostComponent
 * @class FormHostComponent
 *
 * @description
 * Binds a required month through Signal Forms.
 */
@Component({
  imports: [MonthPickerComponent, FormField],
  template: `<ui-month-picker triggerId="start" [formField]="dates.start" />`,
})
class FormHostComponent {
  // #region Properties
  /**
   * Property dates
   * @readonly
   *
   * @description
   * Required month field.
   *
   * @type {FieldTree<{ start: YearMonth | null }, string | number, 'writable'>}
   */
  public readonly dates: FieldTree<{ start: YearMonth | null }, string | number, 'writable'> = form(
    signal<{ start: YearMonth | null }>({ start: null }),
    (path): void => required(path.start),
  );
  // #endregion
}

/**
 * Function dialog
 *
 * @description
 * Open dialog of the overlay container, if any.
 *
 * @returns {HTMLElement | null} Dialog.
 */
const dialog = (): HTMLElement | null =>
  document.querySelector<HTMLElement>('.cdk-overlay-container [role="dialog"]');

describe('MonthPickerComponent', (): void => {
  beforeEach((): void => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'fr-FR' }] });
  });

  afterEach((): void => document.querySelector('.cdk-overlay-container')?.remove());

  it('shows the placeholder, then the month and year', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('#start');
    expect(trigger.textContent?.trim()).toBe('Choisir un mois');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    fixture.componentInstance.value.set({ year: 2026, month: 3 });
    await fixture.whenStable();
    expect(trigger.textContent?.trim()).toBe('mars 2026');
  });

  it('opens on the chosen month, picks another, closes and gives the focus back', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    fixture.componentInstance.value.set({ year: 2026, month: 3 });
    await fixture.whenStable();
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('#start');
    trigger.click();
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(dialog()?.id);
    expect(document.activeElement?.getAttribute('data-cell')).toBe('2026-03');
    expect(dialog()?.querySelector('[data-cell="2026-01"]')?.getAttribute('aria-disabled')).toBe(
      'true',
    );
    dialog()?.querySelector<HTMLButtonElement>('[data-cell="2026-09"]')?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toEqual({ year: 2026, month: 9 });
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(fixture.componentInstance.touched).toBe(true);
  });

  it('closes on Escape without changing the value', async (): Promise<void> => {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('#start');
    trigger.click();
    await fixture.whenStable();
    (document.activeElement as HTMLElement).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true, cancelable: true }),
    );
    await fixture.whenStable();
    expect(dialog()).toBeNull();
    expect(fixture.componentInstance.value()).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('exposes a required form field, invalid once touched', async (): Promise<void> => {
    const fixture: ComponentFixture<FormHostComponent> = TestBed.createComponent(FormHostComponent);
    await fixture.whenStable();
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('#start');
    expect(trigger.getAttribute('aria-required')).toBe('true');
    expect(trigger.hasAttribute('aria-invalid')).toBe(false);
    trigger.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
  });
});
