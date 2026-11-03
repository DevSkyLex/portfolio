import { Component, signal, type WritableSignal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { AutocompleteComponent } from '@internal/ui/lib/autocomplete/autocomplete.component';

/**
 * Class HostComponent
 * @class HostComponent
 *
 * @description
 * Supplies a signal-backed city list and bound value for autocomplete interaction tests.
 */
@Component({
  imports: [AutocompleteComponent],
  template: `<ui-autocomplete
    inputId="city"
    ariaLabel="Ville"
    [options]="cities"
    [(value)]="city"
  />`,
})
class HostComponent {
  // #region Properties
  /**
   * Property cities
   * @readonly
   *
   * @description
   * City suggestions including an accented value used to verify normalized matching.
   *
   * @type {string[]}
   */
  public readonly cities: string[] = ['Lyon', 'Lille', 'Le Mans', 'Évry'];

  /**
   * Property city
   * @readonly
   *
   * @description
   * Signal-bound model value updated when text is typed or a suggestion is committed.
   *
   * @type {WritableSignal<string>}
   */
  public readonly city: WritableSignal<string> = signal<string>('');
  // #endregion
}

/**
 * Function nth
 *
 * @description
 * Reads a list item for assertions and fails immediately when the requested index has no item.
 *
 * @template T - Item type stored in the array-like collection.
 * @param {ArrayLike<T>} items - Collection to index.
 * @param {number} index - Zero-based item position.
 *
 * @returns {T} Item at the requested index.
 *
 * @throws {Error} When the requested index is not present in the collection.
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
 * Dispatches a bubbling, cancelable keydown event for keyboard interaction tests.
 *
 * @param {Element} target - Element receiving the keyboard event.
 * @param {string} name - Keyboard key value.
 *
 * @returns {void} Completes after the event dispatch.
 */
const key = (target: Element, name: string): void => {
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }),
  );
};

/**
 * Function type
 *
 * @description
 * Updates an input element's value and dispatches a bubbling input event through Angular's listener.
 *
 * @param {HTMLInputElement} field - Autocomplete input element.
 * @param {string} text - Text to enter.
 *
 * @returns {void} Completes after the input event dispatch.
 */
const type = (field: HTMLInputElement, text: string): void => {
  field.value = text;
  field.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('AutocompleteComponent', () => {
  afterEach(() => document.querySelector('.cdk-overlay-container')?.remove());

  /**
   * Function setup
   *
   * @description
   * Creates and stabilizes the host fixture, then exposes the input and rendered listbox options for interaction assertions.
   *
   * @returns {Promise<{ fixture: ComponentFixture<HostComponent>; field: HTMLInputElement; options: () => HTMLElement[] }>} Stable fixture and DOM query helpers.
   */
  async function setup(): Promise<{
    fixture: ComponentFixture<HostComponent>;
    field: HTMLInputElement;
    options: () => HTMLElement[];
  }> {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const field: HTMLInputElement = fixture.nativeElement.querySelector('#city');

    /**
     * Function options
     *
     * @description
     * Reads currently rendered option elements from the CDK overlay container.
     *
     * @returns {HTMLElement[]} Visible listbox options.
     */
    const options = (): HTMLElement[] =>
      Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
    return { fixture, field, options };
  }

  it('keeps the typed text as the value and suggests the matches', async () => {
    const { fixture, field, options } = await setup();
    type(field, 'l');
    await fixture.whenStable();
    expect(fixture.componentInstance.city()).toBe('l');
    expect(field.getAttribute('aria-expanded')).toBe('true');
    expect(options().map((option) => option.textContent?.trim())).toEqual([
      'Lyon',
      'Lille',
      'Le Mans',
    ]);

    // No suggestion is active yet: Enter keeps the free text.
    key(field, 'Enter');
    await fixture.whenStable();
    expect(fixture.componentInstance.city()).toBe('l');
  });

  it('picks a suggestion with the arrows and Enter', async () => {
    const { fixture, field, options } = await setup();
    type(field, 'li');
    await fixture.whenStable();
    key(field, 'ArrowDown');
    await fixture.whenStable();
    expect(field.getAttribute('aria-activedescendant')).toBe(nth(options(), 0).id);
    key(field, 'Enter');
    await fixture.whenStable();
    expect(fixture.componentInstance.city()).toBe('Lille');
    expect(field.value).toBe('Lille');
    expect(field.getAttribute('aria-expanded')).toBe('false');
  });

  it('matches without accents and stays closed when nothing matches', async () => {
    const { fixture, field, options } = await setup();
    type(field, 'evr');
    await fixture.whenStable();
    expect(options().map((option) => option.textContent?.trim())).toEqual(['Évry']);

    type(field, 'Paris');
    await fixture.whenStable();
    expect(field.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.componentInstance.city()).toBe('Paris');
  });

  it('closes on Escape, then clears the field', async () => {
    const { fixture, field } = await setup();
    type(field, 'ly');
    await fixture.whenStable();
    key(field, 'Escape');
    await fixture.whenStable();
    expect(field.getAttribute('aria-expanded')).toBe('false');
    key(field, 'Escape');
    await fixture.whenStable();
    expect(fixture.componentInstance.city()).toBe('');
  });
});
