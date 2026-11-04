import { Component, LOCALE_ID, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormField, form, required, type FieldTree } from '@angular/forms/signals';
import { PeriodPickerComponent } from '@internal/ui/lib/period-picker/period-picker.component';
import type { Period } from '@internal/ui/lib/period-picker/models/period/period.interface';
import type { PeriodPrecision } from '@internal/ui/lib/period-picker/models/period-precision/period-precision.type';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Binds a period and the precision of the picker.
 */
@Component({
  imports: [PeriodPickerComponent],
  template: `<ui-period-picker triggerId="period" [precision]="precision()" [(value)]="value" />`,
})
class HostComponent {
  // #region Properties
  /**
   * Property value
   * @readonly
   *
   * @description
   * Bound period.
   *
   * @type {WritableSignal<Period | null>}
   */
  public readonly value: WritableSignal<Period | null> = signal<Period | null>(null);

  /**
   * Property precision
   * @readonly
   *
   * @description
   * Precision of the picker.
   *
   * @type {WritableSignal<PeriodPrecision>}
   */
  public readonly precision: WritableSignal<PeriodPrecision> = signal<PeriodPrecision>('month');
  // #endregion
}

/**
 * Class FormHostComponent
 * @class FormHostComponent
 *
 * @description
 * Binds a required period through Signal Forms.
 */
@Component({
  imports: [PeriodPickerComponent, FormField],
  template: `<ui-period-picker triggerId="period" [formField]="entry.period" />`,
})
class FormHostComponent {
  // #region Properties
  /**
   * Property entry
   * @readonly
   *
   * @description
   * Required period field.
   *
   * @type {FieldTree<{ period: Period | null }, string | number, 'writable'>}
   */
  public readonly entry: FieldTree<{ period: Period | null }, string | number, 'writable'> = form(
    signal<{ period: Period | null }>({ period: null }),
    (path): void => required(path.period),
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

/**
 * Function choose
 *
 * @description
 * Clicks a cell of the open dialog.
 *
 * @param {string} key - Cell key (`yyyy-mm` or `yyyy`).
 *
 * @returns {void}
 */
const choose = (key: string): void => {
  const cell: HTMLButtonElement | null | undefined = dialog()?.querySelector<HTMLButtonElement>(
    `[data-cell="${key}"]`,
  );
  if (!cell) throw new Error(`No cell ${key}`);
  cell.click();
};

/**
 * Function text
 *
 * @description
 * Trigger text with spaces normalized (ICU may write thin spaces around dashes).
 *
 * @param {HTMLElement} trigger - Trigger.
 *
 * @returns {string} Text.
 */
const text = (trigger: HTMLElement): string =>
  trigger.textContent?.replace(/\s+/g, ' ').trim() ?? '';

/**
 * Function setup
 *
 * @description
 * Mounts the host in French with a value and opens the dialog.
 *
 * @param {Period | null} value - Initial period.
 * @param {PeriodPrecision} precision - Precision.
 *
 * @returns {Promise<{ fixture: ComponentFixture<HostComponent>; host: HostComponent; trigger: HTMLButtonElement }>} Handles.
 */
async function setup(
  value: Period | null = null,
  precision: PeriodPrecision = 'month',
): Promise<{
  fixture: ComponentFixture<HostComponent>;
  host: HostComponent;
  trigger: HTMLButtonElement;
}> {
  const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
  fixture.componentInstance.value.set(value);
  fixture.componentInstance.precision.set(precision);
  await fixture.whenStable();
  const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('#period');
  trigger.click();
  await fixture.whenStable();
  return { fixture, host: fixture.componentInstance, trigger };
}

describe('PeriodPickerComponent', (): void => {
  beforeEach((): void => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'fr-FR' }] });
  });

  afterEach((): void => document.querySelector('.cdk-overlay-container')?.remove());

  it('sets the start, then the end, and shows the period', async (): Promise<void> => {
    const { fixture, host, trigger } = await setup();
    expect(text(trigger)).toBe('Choisir une période');
    expect(dialog()?.querySelector('[aria-live="polite"]:not([id])')?.textContent?.trim()).toBe(
      'Choisissez le début.',
    );
    dialog()?.querySelector<HTMLButtonElement>('[aria-label="Année précédente"]')?.click();
    await fixture.whenStable();
    choose('2025-03');
    await fixture.whenStable();
    expect(host.value()).toBeNull();
    expect(dialog()?.textContent).toContain('Choisissez la fin.');
    // An earlier month restarts the period from it.
    choose('2025-01');
    await fixture.whenStable();
    choose('2025-04');
    await fixture.whenStable();
    expect(host.value()).toEqual({
      start: { year: 2025, month: 1 },
      end: { year: 2025, month: 4 },
    });
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(text(trigger)).toBe('janvier – avril 2025');
  });

  it('makes one choice enough while « En cours » is checked, and stays open on the toggle', async (): Promise<void> => {
    const { fixture, host, trigger } = await setup();
    const ongoing: HTMLInputElement | null | undefined =
      dialog()?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    const label: HTMLLabelElement | null | undefined = dialog()?.querySelector('label');
    expect(label?.textContent?.trim()).toBe('En cours');
    expect(label?.getAttribute('for')).toBe(ongoing?.id);
    // A start chosen first becomes ongoing as soon as the option is checked.
    choose('2026-07');
    await fixture.whenStable();
    ongoing?.click();
    await fixture.whenStable();
    expect(host.value()).toEqual({ start: { year: 2026, month: 7 }, end: null });
    expect(dialog()).not.toBeNull();
    choose('2026-02');
    await fixture.whenStable();
    expect(host.value()).toEqual({ start: { year: 2026, month: 2 }, end: null });
    expect(dialog()).toBeNull();
    expect(text(trigger)).toBe('Depuis février 2026');
  });

  it('keeps the start of an ongoing period pending once « En cours » is unchecked', async (): Promise<void> => {
    const { fixture, host } = await setup({ start: { year: 2026, month: 2 }, end: null });
    const ongoing: HTMLInputElement | null | undefined =
      dialog()?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(ongoing?.checked).toBe(true);
    ongoing?.click();
    await fixture.whenStable();
    expect(dialog()?.textContent).toContain('Choisissez la fin.');
    choose('2026-06');
    await fixture.whenStable();
    expect(host.value()).toEqual({
      start: { year: 2026, month: 2 },
      end: { year: 2026, month: 6 },
    });
  });

  it('switches to whole years when flexible, and clears the value', async (): Promise<void> => {
    const { fixture, host, trigger } = await setup(null, 'flexible');
    const years: HTMLButtonElement | undefined = [
      ...(dialog()?.querySelectorAll<HTMLButtonElement>('[uiToggleGroupItem], button') ?? []),
    ].find((button) => button.textContent?.trim() === 'Années');
    years?.click();
    await fixture.whenStable();
    expect(dialog()?.querySelector('[aria-live][id]')?.textContent?.trim()).toBe('2016 – 2027');
    choose('2023');
    await fixture.whenStable();
    choose('2026');
    await fixture.whenStable();
    expect(host.value()).toEqual({
      start: { year: 2023, month: null },
      end: { year: 2026, month: null },
    });
    expect(text(trigger).replace(/ ?– ?/, '–')).toBe('2023–2026');

    trigger.click();
    await fixture.whenStable();
    expect(dialog()?.querySelector('[aria-live][id]')?.textContent?.trim()).toBe('2016 – 2027');
    [...(dialog()?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
      .find((button) => button.textContent?.trim() === 'Effacer')
      ?.click();
    await fixture.whenStable();
    expect(host.value()).toBeNull();
  });

  it('exposes a required form field, invalid once touched', async (): Promise<void> => {
    const fixture: ComponentFixture<FormHostComponent> = TestBed.createComponent(FormHostComponent);
    await fixture.whenStable();
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('#period');
    expect(trigger.getAttribute('aria-required')).toBe('true');
    expect(trigger.hasAttribute('aria-invalid')).toBe(false);
    trigger.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
  });
});
