import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormField, form, type FieldTree } from '@angular/forms/signals';
import { ComboboxOptionComponent } from '@internal/ui/lib/combobox/components/combobox-option/combobox-option.component';
import { ComboboxComponent } from '@internal/ui/lib/combobox/combobox.component';

/**
 * Class HostComponent
 *
 * @description
 * Provides a form-bound combobox host for interaction tests.
 */
@Component({
  imports: [ComboboxComponent, ComboboxOptionComponent, FormField],
  template: `
    <ui-combobox inputId="city" ariaLabel="Ville" [formField]="place.city">
      <ui-combobox-option [value]="1">Lyon</ui-combobox-option>
      <ui-combobox-option [value]="2" [keywords]="['Bouches-du-Rhône']"
        >Marseille</ui-combobox-option
      >
      <ui-combobox-option [value]="3">Montréal</ui-combobox-option>
    </ui-combobox>
  `,
})
class HostComponent {
  // #region Properties
  /**
   * Property model
   *
   * @description
   * Holds the city value inspected by the form integration assertions.
   */
  public readonly model: WritableSignal<{ city: number | null }> = signal<{ city: number | null }>({
    city: null,
  });

  /**
   * Property place
   *
   * @description
   * Exposes the city model through Angular Signal Forms.
   */
  public readonly place: FieldTree<{ city: number | null }, string | number, 'writable'> = form(
    this.model,
  );
  // #endregion
}

/**
 * Function nth
 *
 * @description
 * Returns an indexed list item and fails when the requested item is absent.
 *
 * @template T - List item type.
 * @param {ArrayLike<T>} items - Indexed collection to read.
 * @param {number} index - Item index.
 * @returns {T} Item at the requested index.
 */
const nth = <T>(items: ArrayLike<T>, index: number): T => {
  const item: T | undefined = items[index];
  if (item === undefined) throw new Error(`No item ${index}`);
  return item;
};

/**
 * Function key
 *
 * @description
 * Dispatches a bubbling, cancelable keydown event to the target element.
 *
 * @param {Element} target - Element receiving the event.
 * @param {string} name - Keyboard key value.
 * @param {KeyboardEventInit} init - Additional keyboard event properties.
 * @returns {void}
 */
const key = (target: Element, name: string, init: KeyboardEventInit = {}): void => {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init }),
  );
};

/**
 * Function type
 *
 * @description
 * Updates the native field value and dispatches its input event.
 *
 * @param {HTMLInputElement} field - Field to update.
 * @param {string} text - Text to enter.
 * @returns {void}
 */
const type = (field: HTMLInputElement, text: string): void => {
  field.value = text;
  field.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('ComboboxComponent', () => {
  afterEach(() => document.querySelector('.cdk-overlay-container')?.remove());

  /**
   * Function setup
   *
   * @description
   * Creates the host fixture and returns the field and visible option query.
   *
   * @returns {Promise<{ fixture: ComponentFixture<HostComponent>; field: HTMLInputElement; visible: () => HTMLElement[] }>}
   * Fixture handles used by the interaction tests.
   */
  async function setup(): Promise<{
    fixture: ComponentFixture<HostComponent>;
    field: HTMLInputElement;
    visible: () => HTMLElement[];
  }> {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const field: HTMLInputElement = fixture.nativeElement.querySelector('#city');

    /**
     * Function visible
     *
     * @description
     * Returns currently displayed option elements from the overlay.
     *
     * @returns {HTMLElement[]} Visible option rows.
     */
    const visible = (): HTMLElement[] =>
      Array.from(document.querySelectorAll<HTMLElement>('[role="option"]:not([hidden])'));
    return { fixture, field, visible };
  }

  it('exposes an editable combobox with a list popup', async () => {
    const { fixture, field } = await setup();
    expect(field.getAttribute('role')).toBe('combobox');
    expect(field.getAttribute('aria-autocomplete')).toBe('list');
    expect(field.getAttribute('aria-expanded')).toBe('false');

    key(field, 'ArrowDown', { altKey: true });
    await fixture.whenStable();
    expect(field.getAttribute('aria-expanded')).toBe('true');
    expect(field.getAttribute('aria-controls')).toBe(
      document.querySelector('[role="listbox"]')?.id,
    );
    expect(field.hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('filters by label and keywords, ignoring accents, and activates the first match', async () => {
    const { fixture, field, visible } = await setup();
    type(field, 'mo');
    await fixture.whenStable();
    expect(visible().map((option) => option.textContent?.trim())).toEqual(['Montréal']);
    expect(field.getAttribute('aria-activedescendant')).toBe(nth(visible(), 0).id);

    type(field, 'rhone');
    await fixture.whenStable();
    expect(visible().map((option) => option.textContent?.trim())).toEqual(['Marseille']);
  });

  it('shows the empty state when nothing matches', async () => {
    const { fixture, field, visible } = await setup();
    type(field, 'zzz');
    await fixture.whenStable();
    expect(visible().length).toBe(0);
    expect(document.querySelector('[data-slot="combobox-empty"]')?.textContent?.trim()).toBe(
      'Aucun résultat',
    );
  });

  it('chooses with the arrows and Enter, writing the form field and the label', async () => {
    const { fixture, field, visible } = await setup();
    field.focus();
    key(field, 'ArrowDown');
    key(field, 'ArrowDown');
    await fixture.whenStable();
    expect(field.getAttribute('aria-activedescendant')).toBe(nth(visible(), 1).id);
    key(field, 'Enter');
    await fixture.whenStable();
    expect(fixture.componentInstance.model().city).toBe(2);
    expect(field.value).toBe('Marseille');
    expect(field.getAttribute('aria-expanded')).toBe('false');

    key(field, 'ArrowDown');
    await fixture.whenStable();
    expect(nth(visible(), 1).getAttribute('aria-selected')).toBe('true');
  });

  it('puts back the label on blur and clears the value when the field is emptied', async () => {
    const { fixture, field } = await setup();
    fixture.componentInstance.model.set({ city: 1 });
    await fixture.whenStable();
    expect(field.value).toBe('Lyon');

    type(field, 'Lyo');
    field.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(field.value).toBe('Lyon');
    expect(fixture.componentInstance.place.city().touched()).toBe(true);

    type(field, '');
    field.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(fixture.componentInstance.model().city).toBeNull();
  });
});
