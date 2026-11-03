import { type WritableSignal, Component, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import {
  type FieldTree,
  type PathKind,
  type SchemaPathTree,
  FormField,
  form,
  required,
} from '@angular/forms/signals';
import { SelectOptionComponent } from '@internal/ui/lib/select/components/select-option/select-option.component';
import {
  SelectGroupDirective,
  SelectLabelDirective,
} from '@internal/ui/lib/select/directives/select-parts/select-parts.directive';
import { SelectComponent } from '@internal/ui/lib/select/select.component';

/**
 * Component HostComponent
 * @class HostComponent
 *
 * @description
 * Test host binds the select to a required Signal Form field and exposes grouped enabled and disabled options.
 */
@Component({
  imports: [
    SelectComponent,
    SelectOptionComponent,
    SelectGroupDirective,
    SelectLabelDirective,
    FormField,
  ],
  template: `
    <ui-select triggerId="subject" size="lg" [formField]="contact.subject">
      <div uiSelectGroup>
        <span uiSelectLabel>Sujets</span>
        <ui-select-option value="project">Un projet</ui-select-option>
        <ui-select-option value="mission" disabled>Une mission</ui-select-option>
        <ui-select-option value="talk">Une conférence</ui-select-option>
        <ui-select-option value="other">Autre chose</ui-select-option>
      </div>
    </ui-select>
  `,
})
class HostComponent {
  // #region Properties
  /**
   * Property model
   * @readonly
   *
   * @description
   * Backing form model containing the nullable selected subject value.
   *
   * @type {WritableSignal<{ subject: string | null }>}
   */
  public readonly model: WritableSignal<{ subject: string | null }> = signal<{
    subject: string | null;
  }>({ subject: null });

  /**
   * Property contact
   * @readonly
   *
   * @description
   * Signal Form model that requires a selected subject for the tested select control.
   *
   * @type {FieldTree<{ subject: string | null }>}
   */
  public readonly contact: FieldTree<{ subject: string | null }, string | number, 'writable'> =
    form(this.model, (path: SchemaPathTree<{ subject: string | null }, PathKind.Root>): void =>
      required(path.subject),
    );
  // #endregion
}

/**
 * Constant KEY_CODES
 * @constant
 *
 * @description
 * Legacy key code values used to construct keyboard events expected by the CDK key manager.
 *
 * @type {Record<string, number>}
 */
const KEY_CODES: Record<string, number> = {
  ArrowDown: 40,
  ArrowUp: 38,
  Enter: 13,
  Escape: 27,
  End: 35,
  Home: 36,
  ' ': 32,
};

/**
 * Function key
 * @function key
 *
 * @description
 * Dispatches a bubbling keyboard event and defines the legacy key code consumed by the CDK manager.
 *
 * @param {Element} target - Element receiving the event.
 * @param {string} name - Keyboard key name and lookup key for its legacy code.
 * @returns {void}
 */
const key = (target: Element, name: string): void => {
  const event: KeyboardEvent = new KeyboardEvent('keydown', {
    key: name,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(event, 'keyCode', {
    value: KEY_CODES[name] ?? name.toUpperCase().charCodeAt(0),
  });
  target.dispatchEvent(event);
};

/**
 * Function nth
 * @function nth
 * @template T
 *
 * @description
 * Reads one array-like item and fails immediately when the requested index is absent.
 *
 * @param {ArrayLike<T>} items - Collection to index.
 * @param {number} index - Zero-based item position.
 * @returns {T} Item at the requested position.
 * @throws {Error} When the collection has no item at the given index.
 */
const nth = <T>(items: ArrayLike<T>, index: number): T => {
  const item: T | undefined = items[index];
  if (item === undefined) throw new Error(`No item ${index}`);
  return item;
};

describe('SelectComponent', (): void => {
  afterEach((): void | undefined => document.querySelector('.cdk-overlay-container')?.remove());

  /**
   * Function setup
   * @function setup
   *
   * @description
   * Creates the select host fixture, waits for rendering and exposes its trigger and current overlay options.
   *
   * @returns {Promise<{ fixture: ComponentFixture<HostComponent>; trigger: HTMLButtonElement; options: () => HTMLElement[] }>}
   * Fixture handles used by the select interaction cases.
   */
  async function setup(): Promise<{
    fixture: ComponentFixture<HostComponent>;
    trigger: HTMLButtonElement;
    options: () => HTMLElement[];
  }> {
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const trigger: HTMLButtonElement = fixture.nativeElement.querySelector('#subject');
    const options = (): HTMLElement[] =>
      Array.from(document.querySelectorAll<HTMLElement>('[role="option"]'));
    return { fixture, trigger, options };
  }

  it('shows the placeholder in a combobox button sized like the inputs', async (): Promise<void> => {
    const { trigger } = await setup();
    expect(trigger.getAttribute('role')).toBe('combobox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-required')).toBe('true');
    expect(trigger.className).toContain('h-14');
    expect(trigger.textContent?.trim()).toBe('Choisir une option');
  });

  it('opens a listbox with the keyboard and moves the active descendant past disabled options', async (): Promise<void> => {
    const { fixture, trigger, options } = await setup();
    trigger.focus();
    key(trigger, 'ArrowDown');
    await fixture.whenStable();
    const listbox: Element | null = document.querySelector('[role="listbox"]');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(listbox?.id);
    expect(listbox?.querySelector('[role="group"]')?.getAttribute('aria-labelledby')).toBe(
      listbox?.querySelector('[data-slot="select-label"]')?.id,
    );
    expect(trigger.getAttribute('aria-activedescendant')).toBe(nth(options(), 0).id);

    key(trigger, 'ArrowDown');
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-activedescendant')).toBe(nth(options(), 2).id);
    expect(nth(options(), 2).hasAttribute('data-active')).toBe(true);
    expect(nth(options(), 1).getAttribute('aria-disabled')).toBe('true');

    key(trigger, 'End');
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-activedescendant')).toBe(nth(options(), 3).id);
    expect(document.activeElement).toBe(trigger);
  });

  it('chooses with Enter, writes the form field and shows the label with a check', async (): Promise<void> => {
    const { fixture, trigger, options } = await setup();
    trigger.focus();
    key(trigger, 'ArrowDown');
    key(trigger, 'ArrowDown');
    key(trigger, 'Enter');
    await fixture.whenStable();
    expect(fixture.componentInstance.model().subject).toBe('talk');
    expect(fixture.componentInstance.contact.subject().valid()).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.textContent?.trim()).toBe('Une conférence');

    trigger.click();
    await fixture.whenStable();
    expect(nth(options(), 2).getAttribute('aria-selected')).toBe('true');
    expect(trigger.getAttribute('aria-activedescendant')).toBe(nth(options(), 2).id);
  });

  it('reflects a value set by the form and chooses with the pointer', async (): Promise<void> => {
    const { fixture, trigger, options } = await setup();
    fixture.componentInstance.model.set({ subject: 'other' });
    await fixture.whenStable();
    expect(trigger.textContent?.trim()).toBe('Autre chose');

    trigger.click();
    await fixture.whenStable();
    nth(options(), 0).click();
    await fixture.whenStable();
    expect(fixture.componentInstance.model().subject).toBe('project');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    // The list leaves the page once rolled up.
    await new Promise((resolve: (value: unknown) => void): NodeJS.Timeout =>
      setTimeout(resolve, 300),
    );
    await fixture.whenStable();
    expect(document.querySelector('[role="listbox"]')).toBeNull();
  });

  it('jumps to an option by typeahead and closes on Escape without choosing', async (): Promise<void> => {
    const { fixture, trigger } = await setup();
    trigger.focus();
    key(trigger, 'a');
    await new Promise((resolve: (value: unknown) => void): NodeJS.Timeout =>
      setTimeout(resolve, 250),
    );
    await fixture.whenStable();
    const active: HTMLElement | null = document.getElementById(
      trigger.getAttribute('aria-activedescendant') ?? '',
    );
    expect(active?.textContent?.trim()).toBe('Autre chose');

    key(trigger, 'Escape');
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.componentInstance.model().subject).toBeNull();
  });

  it('wraps around with the arrows and closes on Tab without choosing', async (): Promise<void> => {
    const { fixture, trigger, options } = await setup();
    trigger.focus();
    key(trigger, 'ArrowDown');
    await fixture.whenStable();
    key(trigger, 'ArrowUp');
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-activedescendant')).toBe(nth(options(), 3).id);
    key(trigger, 'ArrowDown');
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-activedescendant')).toBe(nth(options(), 0).id);

    key(trigger, 'Tab');
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.componentInstance.model().subject).toBeNull();
  });

  it('marks the field touched on blur', async (): Promise<void> => {
    const { fixture, trigger } = await setup();
    trigger.focus();
    trigger.blur();
    await fixture.whenStable();
    expect(fixture.componentInstance.contact.subject().touched()).toBe(true);
  });
});
